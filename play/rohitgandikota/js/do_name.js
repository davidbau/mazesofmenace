// do_name.js — naming things.
// C ref: src/do_name.c
//
// rndghostname() and the common path of x_monnam(). It DRAWS twice on the common path and makemon()
// calls it for every PM_GHOST, which the "Ghost of an Adventurer" themeroom
// creates, so skipping it left two calls unspent in the middle of level
// generation.

import { Mgender } from './const.js';
import { genders } from './role_data.js';
import { vtense, makeplural } from './objnam.js';
import { ismnum, CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, CORPSTAT_RANDOM, MALE, FEMALE, NEUTRAL } from './const.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow } from './tty/wintty.js';
import { flush_screen, pline, glyph_at, sensemon, see_with_infrared, vobj_at } from './display.js';
import { discover_object, undiscover_object, rename_disco } from './o_init.js';
import { an, just_an, xname, simpleonames, safe_qbuf, OBJ_DESCR, The } from './objnam.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
         PICK_ONE, ECMD_OK, GETOBJ_PROMPT, GETOBJ_EXCLUDE,
         GETOBJ_DOWNPLAY, GETOBJ_SUGGEST, ONAME_VIA_NAMING,
         ONAME_KNOW_ARTI, GETOBJ_NOFLAGS, OBJ_INVENT, OBJ_FREE, Upolyd } from './const.js';
import { ATR_NONE, NO_COLOR } from './terminal.js';
import { game } from './gstate.js';
import { rn1, rn2, rn2_on_display_rng } from './rng.js';
import { Hallucination, Deaf, See_invisible, Blind } from './youprop.js';
import { PMNAMES, MFLAGS, MSOUND } from './monst_data.js';
import { OCLASSES, ONAMES, obj_descr } from './objects_data.js';
import { ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR,
         M_AP_TYPE, M_AP_MONSTER, PRONOUN_HALLU,
         SUPPRESS_SADDLE, SUPPRESS_IT, SUPPRESS_INVISIBLE,
         SUPPRESS_HALLUCINATION, SUPPRESS_MAPPEARANCE, SUPPRESS_NAME,
         AUGMENT_IT, EXACT_NAME, NON_PM,
         MD_PAD_BOGONS,
         has_mgivenname, MGIVENNAME, W_SADDLE, In_endgame } from './const.js';
import { humanoid, is_animal, is_mplayer, mindless, pronoun_gender,
         type_is_pname, is_rider, mhe, mhis, hides_under } from './mondata.js';
import { canspotmon } from './display.js';
import { ONAME_SKIP_INVUPD } from './const.js';
import { exist_artifact, artifact_exists } from './artifact.js';
import { carried } from './obj.js';
import { getobj, update_inventory, carrying } from './invent.js';
import { cmdq_pop, cmdq_clear } from './cmd.js';
import { CMDQ_KEY, CQ_CANNED } from './const.js';
import { get_rnd_text } from './rumors.js';
import { mungspaces, fuzzymatch, strstri, isok, s_suffix } from './hacklib.js';
import { rank_of } from './botl.js';
import { roles } from './role_data.js';
import { getpos } from './getpos.js';
import { cansee } from './vision.js';
import { m_at, m_next2u } from './mon.js';
import { u_at, M_AP_FURNITURE, M_AP_OBJECT, has_ebones, Is_astralevel } from './const.js';
import { You, verbalize, There } from './pline.js';
import { helpless } from './monst.js';
import { shkname } from './shknam.js';
import { priestname } from './priest.js';
import { object_from_map } from './pager.js';


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

// src/do_name.c:1539 rndorcname() and :1556 christen_orc(). Orcish Town
// uses these for the raiding gang, its local members, and later delivery of
// the gang's migrating loot.
export function rndorcname() {
    const vowels = ['a', 'ai', 'og', 'u'];
    const sounds = ['gor', 'gris', 'un', 'bane', 'ruk', 'oth',
                    'ul', 'z', 'thos', 'akh', 'hai'];
    const count = rn1(2, 3);
    let vowelNext = rn2(2);
    let name = '';

    for (let i = 0; i < count; i++) {
        vowelNext = 1 - vowelNext;
        if (i > 0 && !rn2(30))
            name += '-';
        name += vowelNext ? vowels[rn2(vowels.length)]
                          : sounds[rn2(sounds.length)];
    }
    return name;
}

export function christen_orc(mtmp, gang, other) {
    const orcname = rndorcname();
    let name = null;

    if (gang != null)
        name = `${upstart(orcname)} of ${upstart(gang)}`;
    else if (other != null)
        name = `${upstart(orcname)}${other}`;

    if (name != null && name.length < 256)
        return christen_monst(mtmp, name);
    return mtmp;
}

// src/do_name.c:1424 roguename(), the name used by the Rogue-level ghost.
export function roguename() {
    return rn2(3) ? (rn2(2) ? 'Michael Toy' : 'Kenneth Arnold')
                  : 'Glenn Wichman';
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
            code,
            name_at_start: bogon_is_pname(code),
        };
    }
    return {
        name: pmname(game.mons[name], rn2_on_display_rng(2)),
        code: '',
        name_at_start: false,
    };
}

export function rndmonnam(codeOut) {
    const result = rndmonnam_with_code();
    if (codeOut)
        codeOut.code = result.code;
    return result.name;
}

// src/do_name.c:1415 bogon_is_pname(); decode a bogus monster's prefix.
export function bogon_is_pname(code) {
    return !!code && '-+='.includes(code);
}

// src/mondata.h pmname() — pick from pmnames[male, female, neutral]. The
// neutral form is index 2 and is the fallback when a gendered entry is null.
export function pmname(ptr, gender) {
    const n = ptr?.pmnames;
    if (!n) return '';
    return n[gender] || n[2] || n[0] || '';
}

// src/do_name.c:827 x_monnam() — build a monster's name.
export function x_monnam(mtmp, article, adjective, suppress, called) {
    if (mtmp === game.youmonst)
        return 'you';               /* ignores article, "invisible", &c */

    const mdat = mtmp.data;
    if (game.program_state_gameover)
        suppress |= SUPPRESS_HALLUCINATION;
    if (article === ARTICLE_YOUR && !mtmp.mtame)
        article = ARTICLE_THE;

    const is_engulfer = game.u.uswallow && game.u.ustuck === mtmp;
    if (is_engulfer) {
        article = ARTICLE_THE;
        suppress = (suppress || 0) | SUPPRESS_INVISIBLE;
    }

    const do_hallu = Hallucination()
        && !((suppress || 0) & SUPPRESS_HALLUCINATION);
    const do_invis = !!mtmp.minvis
        && !((suppress || 0) & SUPPRESS_INVISIBLE);

    /* src/do_name.c:875, unseen monsters read as "it". AUGMENT_IT asks for
       "someone" for a thinking humanoid and "something" otherwise; while
       hallucinating, rn2(2) may invert that choice. */
    const do_it = !canspotmon(mtmp) && article !== ARTICLE_YOUR
                  && !game.program_state_gameover
                  && mtmp !== game.u.usteed && !is_engulfer
                  && !((suppress || 0) & SUPPRESS_IT);
    if (do_it) {
        if (!((suppress || 0) & AUGMENT_IT))
            return 'it';
        const someone = humanoid(mdat) && !is_animal(mdat) && !mindless(mdat);
        return (!do_hallu ? someone : !rn2(2)) ? 'someone' : 'something';
    }

    const do_mappear = M_AP_TYPE(mtmp) === M_AP_MONSTER
        && !(suppress & SUPPRESS_MAPPEARANCE);
    if ((mtmp.ispriest || mtmp.isminion) && !do_mappear) {
        const props = game.u.uprops;
        const save_prop = props.HALLUC_RES;
        const save_invis = mtmp.minvis;
        if (!do_hallu)
            props.HALLUC_RES = 1;
        if (!do_invis)
            mtmp.minvis = 0;
        let name = priestname(mtmp, article, (suppress & EXACT_NAME) === EXACT_NAME);
        if (save_prop === undefined)
            delete props.HALLUC_RES;
        else
            props.HALLUC_RES = save_prop;
        mtmp.minvis = save_invis;
        if (article === ARTICLE_NONE && name.startsWith('the '))
            name = name.slice(4);
        return name;
    }

    const pm_name = do_mappear
        ? pmname(game.mons[mtmp.mappearance], Mgender(mtmp)) : mon_pmname(mtmp);
    if (mtmp.isshk && !do_hallu && !do_mappear) {
        const name = shkname(mtmp);
        if (adjective && article === ARTICLE_THE)
            return `the ${adjective} ${name}`;
        if (mdat !== game.mons[PMNAMES.PM_SHOPKEEPER] || do_invis)
            return `${name} the ${do_invis ? 'invisible ' : ''}${pm_name}`;
        return name;
    }

    /* Put the adjectives in the buffer. src/do_name.c:943 says "saddled"
       is appended for a steed wearing its saddle unless SUPPRESS_SADDLE,
       Blind or Hallucination. */
    let buf = adjective ? adjective + ' ' : '';
    if (do_invis)
        buf += 'invisible ';
    const do_saddle = !((suppress || 0) & SUPPRESS_SADDLE);
    if (do_saddle && ((mtmp.misc_worn_check || 0) & W_SADDLE)
        && !Blind() && !Hallucination())
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
    } else if ((!(suppress & SUPPRESS_NAME) || type_is_pname(mdat))
               && has_mgivenname(mtmp)) {
        const name = MGIVENNAME(mtmp);
        if (mtmp.mnum === PMNAMES.PM_GHOST) {
            buf += `${s_suffix(name)} ghost`;
            name_at_start = true;
        } else if (called) {
            buf += `${pm_name} called ${name}`;
            name_at_start = type_is_pname(mdat);
        } else if (is_mplayer(mdat) && strstri(name, ' the ') >= 0) {
            const after_the = strstri(name, ' the ') + 5;
            buf = name.slice(0, after_the) + buf + name.slice(after_the);
            article = ARTICLE_NONE;
            name_at_start = true;
        } else {
            buf += name;
            name_at_start = true;
        }
    } else if (is_mplayer(mdat) && !In_endgame(game.u.uz)) {
        const role = roles.find(candidate => candidate.mnum === mtmp.mnum)
                  || game.urole;
        buf += rank_of(mtmp.m_lev, role, !!mtmp.female).toLowerCase();
        name_at_start = false;
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
    case ARTICLE_A:    return just_an(buf) + buf;
    case ARTICLE_NONE:
    default:           return buf;
    }
}

// src/do_name.c:1152 a_monnam() — ARTICLE_A.
// The SUPPRESS_SADDLE when the monster has a given name is not decoration:
// x_monnam appends "saddled" otherwise, and a named steed would read
// "a saddled Fido" instead of "a Fido".
export const Amonnam = (mtmp) => upstart(a_monnam(mtmp));

export const a_monnam = (mtmp) =>
    x_monnam(mtmp, ARTICLE_A, null, has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0,
             false);

// src/do_name.c:1102 noname_monnam(). Shopkeeper names are deliberately
// retained because x_monnam's shopkeeper arm ignores SUPPRESS_NAME.
export const noname_monnam = (mtmp, article) =>
    x_monnam(mtmp, article, null, SUPPRESS_NAME, false);

// src/do_name.c:1035 l_monnam(), a leash name without an article.
export const l_monnam = (mtmp) =>
    x_monnam(mtmp, ARTICLE_NONE, null,
             has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, true);

// src/do_name.c:31 new_mgivenname(); names remain flat in this object model.
export function new_mgivenname(mon, lth) {
    if (lth) {
        mon.mextra ||= { mcorpsenm: NON_PM };
        free_mgivenname(mon);
        mon.mgivenname = '';
    } else if (has_mgivenname(mon)) {
        free_mgivenname(mon);
    }
}

// src/do_name.c:133 christen_monst(); assign or clear a name, with C's limit.
export function christen_monst(mtmp, name) {
    const value = name ? String(name).slice(0, PL_PSIZ - 1) : '';
    new_mgivenname(mtmp, value ? value.length + 1 : 0);
    if (value)
        mtmp.mgivenname = value;
    if (mtmp.mleashed)
        update_inventory();
    return mtmp;
}

// src/do_name.c:157 alreadynamed(); explain attempts to keep or erase a fixed name.
async function alreadynamed(mtmp, monnambuf, usrbuf) {
    if (!usrbuf) {
        const name_not_title = has_mgivenname(mtmp) || type_is_pname(mtmp.data) || mtmp.isshk;
        await pline(`${upstart(monnambuf)} would rather keep ${
            is_rider(mtmp.data) ? 'its' : mhis(mtmp)} existing ${name_not_title ? 'name' : 'title'}.`);
        return true;
    }
    const invisible = strstri(monnambuf, 'invisible ');
    const deity = strstri(monnambuf, ' of ');
    if (fuzzymatch(usrbuf, monnambuf, ' -_', true)
        || (monnambuf.slice(0, 4).toLowerCase() === 'the '
            && fuzzymatch(usrbuf, monnambuf.slice(4), ' -_', true))
        || (invisible >= 0 && fuzzymatch(usrbuf, monnambuf.slice(invisible + 10), ' -_', true))
        || (deity >= 0 && fuzzymatch(usrbuf, monnambuf.slice(deity + 4), ' -_', true))) {
        if (is_rider(mtmp.data))
            await pline(`${upstart(monnambuf)} is already called that.`);
        else
            await pline(`${upstart(mhe(mtmp))} is already called ${monnambuf}.`);
        return true;
    }
    if (mtmp.data === game.mons[PMNAMES.PM_JUIBLEX]
        && strstri(monnambuf, 'Juiblex') >= 0 && usrbuf.toLowerCase() === 'jubilex') {
        await pline(`${upstart(monnambuf)} doesn't like being called ${usrbuf}.`);
        return true;
    }
    return false;
}

// src/do_name.c:199 do_mgivenname(); name a visible monster at a chosen square.
async function do_mgivenname() {
    if (Hallucination()) {
        await You('would never recognize it anyway.');
        return;
    }
    const cc = { x: game.u.ux, y: game.u.uy };
    if (await getpos(cc, false, 'the monster you want to name') < 0 || !isok(cc.x, cc.y))
        return;
    let mtmp, do_swallow = false;
    if (u_at(cc.x, cc.y)) {
        if (game.u.usteed && canspotmon(game.u.usteed)) {
            mtmp = game.u.usteed;
        } else {
            const { beautiful } = await import('./apply.js');
            await pline(`This ${beautiful()} creature is called ${game.plname} and cannot be renamed.`);
            return;
        }
    } else {
        mtmp = m_at(cc.x, cc.y);
    }
    // include/display.h:704 glyph_is_swallow(), using the port's glyph kind.
    if (!mtmp && game.u.uswallow && glyph_at(cc.x, cc.y).kind === 'swallow') {
        mtmp = game.u.ustuck;
        do_swallow = true;
    }
    if (!do_swallow && (!mtmp || (!sensemon(mtmp)
        && (!(cansee(cc.x, cc.y) || see_with_infrared(mtmp))
            || mtmp.mundetected || M_AP_TYPE(mtmp) === M_AP_FURNITURE
            || M_AP_TYPE(mtmp) === M_AP_OBJECT || (mtmp.minvis && !See_invisible()))))) {
        await pline('I see no monster there.');
        return;
    }
    const monnambuf = distant_monnam(mtmp, ARTICLE_THE);
    const name = await name_from_player(`What do you want to call ${monnambuf}?`);
    if (name === null)
        return;
    if ((mtmp.data.geno & MFLAGS.G_UNIQ) && !mtmp.ispriest) {
        if (!await alreadynamed(mtmp, monnambuf, name))
            await pline(`${upstart(monnambuf)} doesn't like being called names!`);
    } else if (mtmp.isshk && !(Deaf() || helpless(mtmp) || mtmp.data.msound <= MSOUND.MS_ANIMAL)) {
        if (!await alreadynamed(mtmp, monnambuf, name)) {
            // SetVoice() is compiled out in the reference recorder.
            await verbalize(`I'm ${shkname(mtmp)}, not ${name}.`);
        }
    } else if (mtmp.ispriest || mtmp.isminion || mtmp.isshk
               || mtmp.data === game.mons[PMNAMES.PM_GHOST] || has_ebones(mtmp)) {
        if (!await alreadynamed(mtmp, monnambuf, name))
            await pline(`${upstart(monnambuf)} will not accept the name ${name}.`);
    } else {
        christen_monst(mtmp, name);
    }
}

// src/do_name.c:1170 distant_monnam(); conceal a distant Astral high priest's deity.
export function distant_monnam(mon, article) {
    if (mon.data === game.mons[PMNAMES.PM_HIGH_CLERIC] && !Hallucination()
        && Is_astralevel(game.u.uz) && !m_next2u(mon))
        return (article === ARTICLE_THE ? 'the ' : '') + (mon.female ? 'high priestess' : 'high priest');
    return x_monnam(mon, article, null, 0, true);
}

// src/do_name.c mon_nam() — ARTICLE_THE, no adjective.
export const mon_nam = (mtmp) =>
    x_monnam(mtmp, ARTICLE_THE, null,
             has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);

// src/do_name.c:1110 m_monnam(), the monster's exact own name without an
// article, hallucination, visibility, appearance, or saddle decoration.
export const m_monnam = (mtmp) =>
    x_monnam(mtmp, ARTICLE_NONE, null,
             SUPPRESS_IT | SUPPRESS_INVISIBLE | SUPPRESS_HALLUCINATION
             | SUPPRESS_SADDLE | SUPPRESS_MAPPEARANCE, false);

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

// src/do_name.c:1065 some_mon_nam(). Like mon_nam(), except an unseen
// monster is "someone" or "something" instead of "it".
export const some_mon_nam = (mtmp) =>
    x_monnam(mtmp, ARTICLE_THE, null,
             (has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0) | AUGMENT_IT,
             false);

// src/do_name.c Monnam() / YMonnam() — the capitalised forms.
export const Monnam  = (mtmp) => upstart(mon_nam(mtmp));
export const YMonnam = (mtmp) => upstart(y_monnam(mtmp));
export const noit_Monnam = (mtmp) => upstart(noit_mon_nam(mtmp));
export const Some_Monnam = (mtmp) => upstart(some_mon_nam(mtmp));

// src/do_name.c:1142 Adjmonnam() -- a capitalized definite monster name
// with an adjective inserted before the ordinary description.
export const Adjmonnam = (mtmp, adjective) =>
    upstart(x_monnam(mtmp, ARTICLE_THE, adjective,
                     has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false));

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

// src/do_name.c:81 free_oname()
export function free_oname(obj) {
    if (obj.oname != null) { /* has_oname(obj) */
        delete obj.oname; /* ONAME(obj) = (char *) 0 */
    }
}

// include/global.h:404 PL_PSIZ
const PL_PSIZ = 63;

// src/do_name.c:105 name_from_player(); EDIT_GETLIN is off in the reference.
// An empty response cancels; a response of spaces clears an existing name.
async function name_from_player(prompt) {
    const { getlin } = await import('./cmd.js');
    const raw = await getlin(prompt);
    if (!raw || raw[0] === '\x1b')
        return null;
    return mungspaces(raw).slice(0, PL_PSIZ - 1);
}

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

// src/do_name.c:467 name_ok() and :290 do_oname(), select and name one
// particular inventory object. The artifact-name restriction path is left to
// oname(); ordinary player notes consume no gameplay RNG.
export function name_ok(obj) {
    if (!obj || obj.oclass === OCLASSES.COIN_CLASS)
        return GETOBJ_EXCLUDE;
    if (!obj.dknown || obj.oartifact || obj.otyp === ONAMES.SPE_NOVEL)
        return GETOBJ_DOWNPLAY;
    return GETOBJ_SUGGEST;
}

async function do_oname(obj) {
    if (obj.otyp === ONAMES.SPE_NOVEL) {
        await pline('That novel already has a published name.');
        return;
    }

    const which = obj.quan > 1 ? 'these' : 'this';
    const name = await name_from_player(`What do you want to name ${which} ${xname(obj)}?`);
    if (name === null)
        return;
    if (obj.oartifact) {
        await pline(`${obj.oname || 'The artifact'} resists the attempt.`);
        return;
    }
    oname(obj, name, ONAME_VIA_NAMING | ONAME_KNOW_ARTI);
}

// src/do_name.c:499 docallcmd() — the #call / #name command: player can name a
// monster, an object, or a type of object.
//
// The menu, cancel path, and level annotation arm are complete. The other
// workers are recorded when selected.
// A queued item action bypasses the category menu, as in C's docallcmd label.
export async function docallcmd() {
    let ch = 0;
    /* if player wants a,b,c instead of i,o when looting, do that here too */
    const abc = !!game.flags.lootabc;

    const cmdq = cmdq_pop();
    if (cmdq) {
        if (cmdq.typ === CMDQ_KEY)
            ch = cmdq.key;
        else
            cmdq_clear(CQ_CANNED);
    } else {
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
    }

    switch (ch) {
    default:
    case 'q':
        break;
    case 'm': /* name a visible monster */
        await do_mgivenname();
        break;
    case 'i': /* name an individual object in inventory */
        {
            const obj = await getobj('name', name_ok, GETOBJ_PROMPT);
            if (obj)
                await do_oname(obj);
        }
        break;
    case 'o': /* name a type of object in inventory */
        {
            const obj = await getobj('call', call_ok, GETOBJ_NOFLAGS);
            if (obj) {
                xname(obj); // C observes it as though examining inventory.
                if (!obj.dknown)
                    await You('would never recognize another one.');
                else
                    await docall(obj);
            }
        }
        break;
    case 'f': /* name a type of object visible on the floor */
        await namefloorobj();
        break;
    case 'd': /* name a type of object on the discoveries list */
        await rename_disco();
        break;
    case 'a': /* annotate level */
        await donamelevel();
        break;
    }
    return ECMD_OK;
}

// src/dungeon.c donamelevel(), the menu prefix selects a level first.
export async function donamelevel() {
    const { dooverview, query_annotation } = await import('./dungeon.js');
    if (game.iflags.menu_requested)
        return await dooverview();
    await query_annotation(null);
    return ECMD_OK;
}

// src/do_name.c:636 docall() — "Call a <object>:" after using an unidentified
// item. The name is stored on the object TYPE (objects[otyp].oc_uname), so it
// shows on every future one of that kind.
//
export async function docall(obj) {
    if (!obj.dknown)
        return; /* probably blind */

    /* src/do_name.c:644 flushes pending status changes before either the
       acknowledgement prompt or the naming prompt captures a frame. */
    await flush_screen(1);

    /* safe_qbuf(qbuf, "Call ", ":", obj, docall_xname, simpleonames, "thing")
       — docall_xname() strips quantity and BUC so the prompt names the TYPE,
       not this particular item. */
    const qbuf = obj.oclass === OCLASSES.POTION_CLASS && obj.fromsink
        ? `Call a stream of ${OBJ_DESCR(game.objects[obj.otyp])} fluid:`
        : safe_qbuf('Call ', ':', obj, docall_xname, simpleonames, 'thing');
    const name = await name_from_player(qbuf);
    if (name === null)
        return;

    const oc = game.objects[obj.otyp];
    const had_name = !!oc.oc_uname;
    /* mungspaces(): all-spaces uncalls the item */
    if (!name) {
        if (had_name) {
            oc.oc_uname = null;
            await undiscover_object(obj.otyp);
        }
    } else {
        oc.oc_uname = name;
        discover_object(obj.otyp, false, true, true);
    }
    if (obj.where === OBJ_INVENT || carrying(obj.otyp))
        update_inventory();
}

/* src/do_name.c docall_xname() — the object named as its type: one of them,
   no blessed/cursed prefix. */
function docall_xname(obj) {
    const otemp = { ...obj, quan: 1, blessed: 0, cursed: 0, oextra: null, oname: null };
    if (otemp.oclass === OCLASSES.WEAPON_CLASS)
        otemp.opoisoned = 0;
    else if (otemp.oclass === OCLASSES.POTION_CLASS)
        otemp.odiluted = 0;
    else if (otemp.otyp === ONAMES.TOWEL || otemp.otyp === ONAMES.STATUE)
        otemp.spe = 0;
    else if (otemp.otyp === ONAMES.TIN)
        otemp.known = 0;
    else if (otemp.otyp === ONAMES.FIGURINE)
        otemp.corpsenm = NON_PM;
    else if (otemp.otyp === ONAMES.HEAVY_IRON_BALL)
        otemp.owt = game.objects[ONAMES.HEAVY_IRON_BALL].oc_weight;
    else if (otemp.oclass === OCLASSES.FOOD_CLASS && otemp.globby)
        otemp.owt = 120;
    return an(xname(otemp));
}

// src/do_name.c:679 namefloorobj(); call a visible type or the top object here.
async function namefloorobj() {
    const cc = { x: game.u.ux, y: game.u.uy };
    const over = game.u.uundetected && hides_under(game.youmonst.data);
    const goal = `object on map (or '.' for one ${over ? 'over' : 'under'} you)`;
    if (await getpos(cc, false, goal) < 0 || cc.x <= 0)
        return;
    let obj = null, fakeobj = false;
    if (u_at(cc.x, cc.y)) {
        obj = vobj_at(game.u.ux, game.u.uy);
    } else {
        const glyph = glyph_at(cc.x, cc.y);
        if (glyph?.kind === 'obj') {
            const result = object_from_map(glyph, cc.x, cc.y);
            obj = result.otmp;
            fakeobj = result.fake;
        }
    }
    if (!obj) {
        await There(`doesn't seem to be any object ${u_at(cc.x, cc.y) ? 'under you' : 'there'}.`);
        return;
    }
    const buf = obj.otyp !== ONAMES.STRANGE_OBJECT
        ? simpleonames(obj) : obj_descr[ONAMES.STRANGE_OBJECT].oc_name;
    const use_plural = obj.quan > 1;
    if (Hallucination()) {
        const role = game.urole;
        const female = Upolyd(game.u) ? game.u.mfemale : game.flags.female;
        const unames = [female && role.name.f ? role.name.f : role.name.m,
            rank_of(rn2_on_display_rng(30) + 1, role, game.flags.female), bogusmon()];
        unames.push(unames[2], roguename(), 'Wibbly Wobbly');
        await pline(`${The(buf)} ${use_plural ? 'decide' : 'decides'} to call you "${
            unames[rn2_on_display_rng(unames.length)]}."`);
    } else if (call_ok(obj) === GETOBJ_EXCLUDE) {
        await pline(`${use_plural ? 'Those' : 'That'} ${buf} can't be assigned a type name.`);
    } else if (!obj.dknown) {
        await You(`don't know ${use_plural ? 'those' : 'that'} ${buf} well enough to name ${
            use_plural ? 'them' : 'it'}.`);
    } else {
        await docall(obj);
    }
    if (fakeobj) {
        obj.where = OBJ_FREE;
        // C dealloc_obj(): object_from_map removed its timers. This temporary
        // has no contents, light, or external owner; JS collects the local.
        obj = null;
    }
}

// src/do.c:395 trycall() — offer to name a type the hero has just used and
// still cannot identify.
export async function trycall(obj) {
    const oc = game.objects[obj.otyp];
    if (!oc.oc_name_known && !oc.oc_uname)
        await docall(obj);
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

// src/do_name.c:1470 rndcolor(), a random real color unless hallucinating.
export function rndcolor() {
    const colors = [
        'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray',
        'transparent', 'orange', 'bright green', 'yellow', 'bright blue',
        'bright magenta', 'bright cyan', 'white',
    ];
    const k = rn2(colors.length);
    return Hallucination() ? hcolor(null)
                           : k === NO_COLOR ? 'colorless' : colors[k];
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

// src/do_name.c:445 objtyp_is_callable()
export function objtyp_is_callable(i) {
    if (game.objects[i].oc_uname)
        return true;

    switch (game.objects[i].oc_class) {
    case OCLASSES.AMULET_CLASS:
        /* 5.0: calling these used to be allowed but that enabled the
           player to tell whether two unID'd amulets of yendor were both
           fake or one was real by calling them distinct names and then
           checking discoveries to see whether first name was replaced
           by second or both names stuck; with more than two available
           to work with, if they weren't all fake it was possible to
           determine which one was the real one */
        if (i === ONAMES.AMULET_OF_YENDOR || i === ONAMES.FAKE_AMULET_OF_YENDOR)
            break; /* return FALSE */
        /*FALLTHRU*/
    case OCLASSES.SCROLL_CLASS:
    case OCLASSES.POTION_CLASS:
    case OCLASSES.WAND_CLASS:
    case OCLASSES.RING_CLASS:
    case OCLASSES.GEM_CLASS:
    case OCLASSES.SPBOOK_CLASS:
    case OCLASSES.ARMOR_CLASS:
    case OCLASSES.TOOL_CLASS:
    case OCLASSES.VENOM_CLASS:
        if (obj_descr[i]?.oc_descr)
            return true;
        break;
    default:
        break;
    }
    return false;
}

// src/do_name.c:480 call_ok() — getobj callback for object type to name
export function call_ok(obj) {
    if (!obj || !objtyp_is_callable(obj.otyp))
        return GETOBJ_EXCLUDE;
    /* not a likely candidate if not seen yet since naming will fail,
       or if it has been discovered and doesn't already have a name;
       when something has been named and then becomes discovered, it
       remains a likely candidate until player renames it to <space>
       to remove that no longer needed name */
    if (!obj.dknown || (game.objects[obj.otyp].oc_name_known
                        && !game.objects[obj.otyp].oc_uname))
        return GETOBJ_DOWNPLAY;
    return GETOBJ_SUGGEST;
}

/* src/do_name.c:1365 bogon_codes[], see dat/bonusmon.txt */
const bogon_codes = '-_+|=';

// src/do_name.c:1369 bogusmon(), a random bogus monster name; a leading
// code character is stripped and reported through codeOut.code.
export function bogusmon(codeOut) {
    let mnam;

    if (codeOut)
        codeOut.code = '';
    mnam = get_rnd_text('bogusmon', rn2_on_display_rng, MD_PAD_BOGONS);
    if (!mnam) {
        mnam = 'bogon';
    } else if (bogon_codes.includes(mnam[0])) { /* strip prefix if present */
        if (codeOut)
            codeOut.code = mnam[0];
        mnam = mnam.slice(1);
    }
    return mnam;
}

// src/do_name.c:1321 obj_pmname(), the monster name of a corpse, statue,
// or figurine, honoring the gender recorded in obj->spe.
export function obj_pmname(obj) {
    if ((obj.otyp === ONAMES.CORPSE || obj.otyp === ONAMES.STATUE
         || obj.otyp === ONAMES.FIGURINE)
        && ismnum(obj.corpsenm)) {
        const cgend = (obj.spe & CORPSTAT_GENDER),
            mgend = ((cgend === CORPSTAT_MALE) ? MALE
                     : (cgend === CORPSTAT_FEMALE) ? FEMALE
                       : NEUTRAL);
        let mndx = obj.corpsenm;

        /* mons[].pmnames[] for monster cleric uses "priest" or "priestess"
           or "aligned cleric"; we want to avoid "aligned cleric [corpse]"
           unless it has been explicitly flagged as neuter rather than
           defaulting to random (which fails male or female check above);
           role monster cleric uses "priest" or "priestess" or "cleric"
           without "aligned" prefix so we switch to that; [can't force
           random gender to be chosen here because splitting a stack of
           corpses could cause the split-off portion to change gender, so
           settle for avoiding "aligned"] */
        if (mndx === PMNAMES.PM_ALIGNED_CLERIC && cgend === CORPSTAT_RANDOM)
            mndx = PMNAMES.PM_CLERIC;
        return pmname(game.mons[mndx], mgend);
    }
    /* impossible("obj_pmname otyp:%i,corpsenm:%i", obj->otyp, obj->corpsenm); */
    return 'two-legged glorkum-seeker';
}

// src/do_name.c:1221 monverbself(), "<mon> <verb>s [othertext] <self>";
// a plural subject keeps the plural verb and "themselves".
export function monverbself(mon, monnamtext, verb, othertext) {
    let verbs;
    let selfbuf; /* sizeof "themselves" suffices */

    selfbuf = mon_nam_too(mon, mon);
    verbs = vtense(selfbuf, verb);
    if (verb === verbs) { /* a match indicates that it stayed plural */
        monnamtext = makeplural(monnamtext);
        if (monnamtext.toLowerCase() === genders[3].he) {
            const capitaliz = (monnamtext[0] === monnamtext[0].toUpperCase());

            monnamtext = genders[3].him;
            if (capitaliz)
                monnamtext = monnamtext[0].toUpperCase() + monnamtext.slice(1);
        }
    }
    monnamtext += ' ' + verbs;
    if (othertext)
        monnamtext += ' ' + othertext;
    monnamtext += ' ' + selfbuf;
    return monnamtext;
}

export { mhe } from './mondata.js';

// src/do_name.c:1313 mon_pmname(); the monster's species name for its gender
export function mon_pmname(mon) {
    return pmname(mon.data, Mgender(mon));
}

// src/do_name.c:95 safe_oname(); the object's name or ""
export function safe_oname(obj) {
    if (obj.oname)
        return obj.oname;
    return '';
}

// src/do_name.c:51 free_mgivenname(); forget the monster's given name
export function free_mgivenname(mon) {
    if (has_mgivenname(mon)) {
        mon.mgivenname = null;
        if (mon.mextra?.mgivenname)
            mon.mextra.mgivenname = null;
    }
}
