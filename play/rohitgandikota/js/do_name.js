// do_name.js — naming things.
// C ref: src/do_name.c
//
// rndghostname() and the common path of x_monnam(). It DRAWS twice on the common path and makemon()
// calls it for every PM_GHOST, which the "Ghost of an Adventurer" themeroom
// creates, so skipping it left two calls unspent in the middle of level
// generation.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR,
         M_AP_TYPE, M_AP_MONSTER } from './const.js';
import { humanoid, is_animal, mindless } from './mondata.js';
import { canspotmon } from './display.js';

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

// src/mondata.h pmname() — pick from pmnames[male, female, neutral]. The
// neutral form is index 2 and is the fallback when a gendered entry is null.
function pmname(ptr, gender) {
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

    const mdat = game.mons[mtmp.mnum];

    if (mtmp.ispriest || mtmp.isminion)
        note_do_name_unported('x_monnam:priestname');
    if (M_AP_TYPE(mtmp) === M_AP_MONSTER)
        note_do_name_unported('x_monnam:mappearance');
    if (mtmp.isshk)
        note_do_name_unported('x_monnam:shkname');
    if (mtmp.minvis)
        note_do_name_unported('x_monnam:invisible');
    /* src/do_name.c:875 — unseen monsters read as "it". do_it is guarded on
       ARTICLE_YOUR too, so a pet is still named even when unseen, and on
       usteed and engulfer for the same reason. SUPPRESS_IT and AUGMENT_IT
       are not modelled, so augment_it is false and the "someone"/"something"
       arm cannot fire -- that arm's rn2(2) under Hallucination is therefore
       not spent, which matches C only while Hallucination is unported. */
    const do_it = !canspotmon(mtmp) && article !== ARTICLE_YOUR
                  && mtmp !== game.u.usteed;
    if (do_it) {
        note_do_name_unported('x_monnam:augment_it');
        return 'it';
    }

    let buf = pmname(mdat, 2);      /* neutral; Mgender is not ported */

    if (adjective)
        buf = adjective + ' ' + buf;

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

// src/do_name.c mon_nam() — ARTICLE_THE, no adjective.
export const mon_nam = (mtmp) => x_monnam(mtmp, ARTICLE_THE, null, 0, false);

// src/do_name.c y_monnam() — ARTICLE_YOUR, which x_monnam downgrades to THE
// for anything not tame.
export const y_monnam = (mtmp) => x_monnam(mtmp, ARTICLE_YOUR, null, 0, false);

// src/do_name.c Monnam() / YMonnam() — the capitalised forms.
export const Monnam  = (mtmp) => upstart(mon_nam(mtmp));
export const YMonnam = (mtmp) => upstart(y_monnam(mtmp));

// src/hacklib.c upstart() — capitalise the first letter.
function upstart(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

function note_do_name_unported(what) {
    (game.unported ||= new Set()).add('do_name:' + what);
    return false;
}
