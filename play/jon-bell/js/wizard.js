// wizard.js — C ref: wizard.c.
import { EMIN, STRAT_APPEARMSG, STRAT_WAITFORU } from './const.js';
import { In_W_tower_wz as In_W_tower } from './dochug.js';
import { game } from './gstate.js';
import { Deaf, Monnam, is_lminion, is_minion } from './mcastu.js';
import { helpless } from './mhitm.js';
import { wake_nearto } from './mon.js';
import { pline, verbalize } from './pline.js';
import { com_pager } from './questpgr.js';
import { rn2 } from './rnd.js';
import { In_endgame, Is_rogue_level, MM_NOCOUNTBIRTH, MM_NOMSG, G_EXTINCT } from './const.js'; // relocate-fns
import { Inhell, permonstTemplate, role_maligntyp, set_malign, G_UNIQ } from './makemon.js'; // relocate-fns
import { G_HELL_NC, G_NOHELL_NC, MONS_ROWS, PM_ARCHON_NC, S_DEMON, monsym_isupper_nc, mvitals_genod_nc } from './mklev.js';
import { discard_minvent } from './mkobj.js';
import { makemon } from './makemon.js'; // relocate-fns
import { mongone } from './mon.js'; // relocate-fns
import { attacktype, big_to_little } from './mondata.js'; // relocate-fns
import { rnd } from './rnd.js'; // relocate-fns
import { monster_census, msummon } from './minion.js'; // relocate-fns
import { enexto_out } from './teleport.js'; // relocate-fns
import { SetVoice } from './cmd.js';
import { MAGIC_PORTAL } from './const.js'; // relocate-fns
import { Tobjnam } from './objnam.js'; // relocate-fns
import { You } from './pline.js'; // relocate-fns
import { unmakemon } from './makemon.js'; // relocate-fns
import { NH_BLACK, _hero_Deaf } from './cmd.js'; // relocate-fns
import { Is_astralevel, LARGEST_INT, MM_NOWAIT, STRAT_WAITMASK } from './const.js'; // relocate-fns
import { Unaware as wizard_Unaware } from './display.js'; // relocate-fns
import { mon_arrive, mon_catchup_elapsed_time } from './dog.js'; // relocate-fns
import { hcolor } from './mhitm.js'; // relocate-fns
import { PM_WIZARD_OF_YENDOR } from './pm.generated.js'; // relocate-fns
import { rn1 } from './rng.js'; // relocate-fns
import { rndcurse } from './sit.js'; // relocate-fns
import { Blind as _vision_Blind } from './vision.js'; // relocate-fns

/* C questpgr.c:624 com_pager() directly imported from ./questpgr.js */

export function has_aggravatables(mon) {
    const u = game.u;
    const in_w_tower = In_W_tower(mon.mx, mon.my, u.uz);

    if (in_w_tower !== In_W_tower(u.ux, u.uy, u.uz))
        return false;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my, u.uz))
            continue;
        if (((mtmp.mstrategy | 0) & STRAT_WAITFORU) !== 0 || helpless(mtmp))
            return true;
    }
    return false;
}

export function mon_has_special(mtmp) {
    const AMULET_OF_YENDOR = 213;
    const BELL_OF_OPENING = 263;
    const CANDELABRUM_OF_INVOCATION = 262;
    const SPE_BOOK_OF_THE_DEAD = 409; /* objects.h SPELL() BOOK_OF_THE_DEAD; was 264 = TRIPE_RATION */
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
        if (otmp.otyp === AMULET_OF_YENDOR
            || (otmp.oartifact | 0) >= 21 /* any_quest_artifact, obj.h:271 ART_ORB_OF_DETECTION */
            || otmp.otyp === BELL_OF_OPENING
            || otmp.otyp === CANDELABRUM_OF_INVOCATION
            || otmp.otyp === SPE_BOOK_OF_THE_DEAD)
            return 1;
    return 0;
}

// DEADMONSTER macro: #define DEADMONSTER(mon) ((mon)->mhp < 1)
export function DEADMONSTER(mon) {
    return (mon.mhp | 0) < 1;
}

export function aggravate() {
    const u = game.u;
    const in_w_tower = In_W_tower(u.ux, u.uy, u.uz);

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my, u.uz))
            continue;
        mtmp.mstrategy &= ~(STRAT_WAITFORU | STRAT_APPEARMSG);
        mtmp.msleeping = 0;
        if (mtmp.mcanmove === 0 && !rn2(5)) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}

// wizard.c:824-833 — flavor-text tables rolled by cuss().
const random_insult = [
    'antic', 'blackguard', 'caitiff', 'chucklehead',
    'coistrel', 'craven', 'cretin', 'cur',
    'dastard', 'demon fodder', 'dimwit', 'dolt',
    'fool', 'footpad', 'imbecile', 'knave',
    'maledict', 'miscreant', 'niddering', 'poltroon',
    'rattlepate', 'reprobate', 'scapegrace', 'varlet',
    'villein',
    'wittol', 'worm', 'wretch',
];

const random_malediction = [
    'Hell shall soon claim thy remains,', 'I chortle at thee, thou pathetic',
    'Prepare to die, thou', 'Resistance is useless,',
    'Surrender or die, thou', 'There shall be no mercy, thou',
    'Thou shalt repent of thy cunning,', 'Thou art as a flea to me,',
    'Thou art doomed,', 'Thy fate is sealed,',
    'Verily, thou shalt be one dead',
];

// wizard.c:60 amulet()/mklev.c:982 precedent read u.uhave.amulet from a
// channel exists — see js/mapstate_game_bridge.js). The only ground truth
// the replay carries is the hero's actual invent chain, so derive the same
// boolean the cache would hold by scanning it for the unique amulet otyp.
export const AMULET_OF_YENDOR = 213;

function uhaveAmulet() {
    if (game.u?.uhave?.amulet)
        return true;
    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        if ((otmp.otyp | 0) === AMULET_OF_YENDOR)
            return true;
    return false;
}

// C ref: wizard.c:845-883 cuss() — insult or intimidate the player.
export function cuss(mtmp) {
    if (Deaf())
        return;
    if (mtmp.iswiz) {
        if (!rn2(5)) {
            pline(`${Monnam(mtmp)} laughs fiendishly.`);
        } else if (uhaveAmulet() && !rn2(random_insult.length)) {
            SetVoice(mtmp, 0, 80, 0);
            verbalize(`Relinquish the amulet, ${random_insult[rn2(random_insult.length)]}!`);
        } else if (game.u.uhp < 5 && !rn2(2)) { /* Panic */
            SetVoice(mtmp, 0, 80, 0);
            // the format-selecting rn2(2) precedes the insult draw.
            const panicked = rn2(2);
            const insult = random_insult[rn2(random_insult.length)];
            verbalize(panicked
                ? `Even now thy life force ebbs, ${insult}!`
                : `Savor thy breath, ${insult}, it be thy last!`);
        } else if (mtmp.mhp < 5 && !rn2(2)) { /* Parthian shot */
            SetVoice(mtmp, 0, 80, 0);
            verbalize(rn2(2) ? 'I shall return.' : "I'll be back.");
        } else {
            SetVoice(mtmp, 0, 80, 0);
            const maledict = random_malediction[rn2(random_malediction.length)];
            const insult = random_insult[rn2(random_insult.length)];
            verbalize(`${maledict} ${insult}!`);
        }
    } else if (is_lminion(mtmp)
               && !(mtmp.isminion && EMIN(mtmp).renegade)) {
        com_pager('angel_cuss');
    } else {
        if (!rn2(is_minion(mtmp.data) ? 100 : 5))
            pline(`${Monnam(mtmp)} casts aspersions on your ancestry.`);
        else
            com_pager('demon_cuss');
    }
    wake_nearto(mtmp.mx, mtmp.my, 5 * 5);
}

/* C wizard.c:31 nasties[] — the 44 forms nasty() summons and that
 * select_newcham_form()'s PM_SANDESTIN and PM_DOPPELGANGER arms roll from.
 * Order is load-bearing: pick_nasty() indexes it with rn2(44), so a permuted
 * table draws the right RNG and returns the wrong monster.
 *
 * Written as literal mons[] indices because js/pm.generated.js still carries
 * NetHack 3.7 SPELLINGS — 5.0 renamed elf-lord -> elf-noble, Elvenking ->
 * elven monarch, ogre king -> ogre tyrant and vampire lord -> vampire leader,
 * so `PM_ELF_NOBLE` etc. simply do not exist there.  Every index below was
 * verified against js/makemon_pmnames.json by NAME, in C's order. */
const NASTIES_NC = [
    /* neutral */
    10,  /* cockatrice */         174, /* ettin */
    153, /* stalker */            177, /* minotaur */
    235, /* owlbear */            115, /* purple worm */
    117, /* xan */                225, /* umber hulk */
    232, /* xorn */               120, /* zruty */
    83,  /* leocrotta */          86,  /* baluchitherium */
    237, /* carnivorous ape */    155, /* fire elemental */
    178, /* jabberwock */         259, /* iron golem */
    58,  /* ochre jelly */        208, /* green slime */
    39,  /* displacer beast */    211, /* genetic engineer */
    /* chaotic */
    149, /* black dragon */       146, /* red dragon */
    186, /* arch-lich */          227, /* vampire leader */
    49,  /* master mind flayer */ 213, /* disenchanter */
    42,  /* winged gargoyle */    175, /* storm giant */
    224, /* Olog-hai */           268, /* elf-noble */
    269, /* elven monarch */      205, /* ogre tyrant */
    281, /* captain */            40,  /* gremlin */
    /* lawful */
    145, /* silver dragon */      148, /* orange dragon */
    151, /* green dragon */       152, /* yellow dragon */
    202, /* guardian naga */      172, /* fire giant */
    122, /* Aleax */              121, /* couatl */
    291, /* horned devil */       293, /* barbed devil */
];

/* C wizard.c:537 pick_nasty(difcap) — "also used by newcham()".
 *
 *     int alt, res = ROLL_FROM(nasties);
 *     if (Is_rogue_level(&u.uz) && !isupper(monsym(&mons[res])))
 *         res = ROLL_FROM(nasties);
 *     alt = res;
 *     if (genocided || (difcap > 0 && mons[res].difficulty >= difcap)
 *         || (mons[res].geno & (Inhell ? G_NOHELL : G_HELL)) != 0)
 *         alt = big_to_little(res);
 *     if (alt != res && !genocided(alt)) {
 *         ... only non-juveniles can become the alternate choice ...
 *         res = alt;
 *     }
 *     return res;
 *
 * ROLL_FROM(a) (hack.h) is a[rn2(SIZE(a))], so the RNG cost is one rn2(44),
 * plus a second one only on the rogue level.  The juvenile filter compares the
 * ALTERNATE's neutral pmname against "baby " and the " hatchling"/" pup"/" cub"
 * suffixes, exactly as C's strncmp/strrchr pair does. */
export function pick_nasty(difcap) {
    let res = NASTIES_NC[rn2(NASTIES_NC.length)];

    /* We want monsters represented by uppercase on rogue level,
       but we don't try very hard. */
    if (Is_rogue_level(game.u?.uz) && !monsym_isupper_nc(res))
        res = NASTIES_NC[rn2(NASTIES_NC.length)];

    /* if genocided or too difficult or out of place, try a substitute
       when a suitable one exists (arch-lich -> master lich, master mind
       flayer -> mind flayer), but the substitutes are likely to be
       genocided too */
    let alt = res;
    const resGeno = MONS_ROWS[res][3] | 0;
    if (mvitals_genod_nc(res)
        || (difcap > 0 && (MONS_ROWS[res][2] | 0) >= difcap)
        /* note: nasty() -> makemon() ignores G_HELL|G_NOHELL; arch-lich and
           master lich are both flagged as hell-only; this filtering demotes
           arch-lich to master lich when outside of Gehennom (unless the
           latter has been genocided) */
        || (resGeno & (Inhell() ? G_NOHELL_NC : G_HELL_NC)) !== 0)
        alt = big_to_little(res);
    if (alt !== res && !mvitals_genod_nc(alt)) {
        const mnam = permonstTemplate(alt).pmnames[NEUTRAL_NC] || '';
        const lastspace = mnam.lastIndexOf(' ');
        const tail = lastspace < 0 ? null : mnam.slice(lastspace);

        /* only non-juveniles can become alternate choice */
        if (mnam.slice(0, 5) !== 'baby '
            && (tail === null
                || (tail !== ' hatchling' && tail !== ' pup' && tail !== ' cub')))
            res = alt;
    }

    return res;
}



export async function nasty(summoner) {
    const u = game.u;
    /* C:597 — "when a monster casts the 'summon nasties' spell, it gives
     * feedback; when random post-Wizard harassment casts that, we give it". */
    const mmflags = summoner ? MM_NOMSG : 0 /* NO_MM_FLAGS */;
    const MAXNASTIES = 10; /* C:601 — more than this can be created */
    let count, tmp, makeindex, s_cls, m_cls, difcap, trylimit, castalign;
    let mtmp;
    const bypos = { x: 0, y: 0 };

    /* C:603-605 — "some candidates may be created in groups, so simple count
     * of non-null makemon() return is inadequate". */
    const census = monster_census(false);

    if (!rn2(10) && Inhell()) {
        /* C:608-609 — this might summon a demon prince or lord */
        count = await msummon(null); /* summons like WoY */
    } else {
        count = 0;
        const smndx = summoner ? (summoner.mnum ?? summoner.mndx ?? 0) | 0 : 0;
        const sdata = summoner ? MONS_ROWS[smndx] : null;
        s_cls = sdata ? (sdata[0] | 0) : 0;
        difcap = sdata ? (sdata[2] | 0) : 0;          /* spellcasters */
        /* role_init() rewrote a quest leader/guardian's maligntyp */
        castalign = sdata ? Math.sign(role_maligntyp(smndx, sdata[4])) : 0;
        tmp = ((u.ulevel | 0) > 3) ? Math.trunc((u.ulevel | 0) / 3) : 1;
        /* C:616-619 — if we don't have a casting monster, nasties appear around
         * the hero, otherwise around the spot the summoner thinks she's at. */
        bypos.x = u.ux | 0;
        bypos.y = u.uy | 0;
        for (let i = rnd(tmp); i > 0 && count < MAXNASTIES; --i) {
            for (let j = 0; j < 20; j++) {
                /* C:640-652 — "Don't create more spellcasters of the monster's
                 * level or higher--avoids chain summoners filling up the
                 * level."  C's `goto nextj` is this loop's `continue`. */
                trylimit = 10 + 1; /* 10 tries */
                let out_of_tries = false;
                do {
                    if (!--trylimit) { out_of_tries = true; break; }
                    makeindex = pick_nasty(difcap);
                    m_cls = MONS_ROWS[makeindex][0] | 0;
                } while ((difcap > 0 && (MONS_ROWS[makeindex][2] | 0) >= difcap
                          && attacktype(permonstTemplate(makeindex), AT_MAGC_NC))
                         || (s_cls === S_DEMON && m_cls === S_ANGEL_NC)
                         || (s_cls === S_ANGEL_NC && m_cls === S_DEMON));
                if (out_of_tries)
                    continue;   /* C: goto nextj */
                /* C:653-656 — do this after picking the monster to place. */
                if (summoner) {
                    const mm = enexto_out(summoner.mux | 0, summoner.muy | 0,
                                          permonstTemplate(makeindex));
                    if (!mm)
                        continue;
                    bypos.x = mm.x;
                    bypos.y = mm.y;
                }
                /* C:657-660 — "this honors genocide but overrides extinction;
                 * it ignores inside-hell-only & outside-hell-only". */
                mtmp = await makemon(permonstTemplate(makeindex), bypos.x, bypos.y, mmflags);
                if (mtmp) {
                    mtmp.msleeping = 0;
                    mtmp.mpeaceful = 0;
                    mtmp.mtame = 0;
                    set_malign(mtmp);
                } else {
                    /* C:663-679 — random monster to substitute for a genocided
                     * selection (or any failed placement), then unmakemon() if
                     * it is a chain-summoning spellcaster or the wrong side of
                     * the demon/angel line. */
                    mtmp = await makemon(null, bypos.x, bypos.y, mmflags);
                    if (mtmp) {
                        const sndx = (mtmp.mnum ?? mtmp.mndx ?? 0) | 0;
                        m_cls = MONS_ROWS[sndx][0] | 0;
                        if ((difcap > 0 && (MONS_ROWS[sndx][2] | 0) >= difcap
                             && rn2(In_endgame(game.u?.uz) ? 3 : 7)
                             && attacktype(permonstTemplate(sndx), AT_MAGC_NC))
                            || (s_cls === S_DEMON && m_cls === S_ANGEL_NC)
                            || (s_cls === S_ANGEL_NC && m_cls === S_DEMON))
                            mtmp = await unmakemon(mtmp, 0 /* NO_MM_FLAGS */);
                    }
                }

                if (mtmp) {
                    const mndx_new = (mtmp.mnum ?? mtmp.mndx ?? 0) | 0;
                    /* C:682-693 — creating an arch-lich or Archon caps the
                     * difficulty of every later pick. */
                    if (mndx_new === PM_ARCH_LICH_NC || mndx_new === PM_ARCHON_NC) {
                        tmp = Math.min(MONS_ROWS[PM_ARCHON_NC][2] | 0,      /* A:26 */
                                       MONS_ROWS[PM_ARCH_LICH_NC][2] | 0); /* L:31 */
                        if (!difcap || difcap > tmp)
                            difcap = tmp;
                    }
                    /* C:694-695 — delay first use of spell or breath attack. */
                    mtmp.mspec_used = rnd(4);

                    if (++count >= MAXNASTIES
                        || (MONS_ROWS[mndx_new][4] | 0) === 0
                        || Math.sign(MONS_ROWS[mndx_new][4] | 0) === castalign)
                        break;
                }
            } /* for j */
        } /* for i */
    }

    if (count)
        count = monster_census(false) - census;
    return count;
}

/* monsters.h ordinal, verified by NAME against js/makemon_pmnames.json (row 186
 * is "arch-lich"); PM_ARCHON_NC above is the companion. */
const PM_ARCH_LICH_NC = 186;

const S_ANGEL_NC = 27;    /* defsym.h:326 MONSYM(27, 'A', ANGEL, S_ANGEL, ...) */

const AT_MAGC_NC = 255;   /* monattk.h:29 */

/* C monflag.h:214 `enum mgender { MALE, FEMALE, NEUTRAL, ... }` — NEUTRAL is
 * the pmnames[] slot holding a form's canonical name. */
const NEUTRAL_NC = 2;

/* C ref: wizard.c:105-114 mon_has_amulet(mtmp) */
export function mon_has_amulet(mtmp) {
    for (let otmp = mtmp?.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === AMULET_OF_YENDOR)
            return 1;
    }
    return 0;
}

function distu(x, y) {
    const u = game.u || {};
    const dx = (u.ux | 0) - (x | 0);
    const dy = (u.uy | 0) - (y | 0);
    return dx * dx + dy * dy;
}

function m_next2u(mtmp) {
    const u = game.u || {};
    return Math.abs((mtmp.mx | 0) - (u.ux | 0)) <= 1
        && Math.abs((mtmp.my | 0) - (u.uy | 0)) <= 1;
}

/* ---------------------------------------------------------------------------
 * amulet — If you've found the Amulet, make the Wizard appear after some time.
 * Also, give hints about portal locations, if amulet is worn/wielded.
 * C ref: nethack-c/src/wizard.c:60
 * ---------------------------------------------------------------------------
 */
export async function amulet() {
    const u = game.u || {};
    const gf = game;

    /* Check if the amulet is worn or wielded */
    let amu = u.uamul;
    if (!amu || (amu.otyp | 0) !== AMULET_OF_YENDOR) {
        amu = u.uwep;
        if (!amu || (amu.otyp | 0) !== AMULET_OF_YENDOR)
            amu = null;
    }
    if (amu && !rn2(15)) {
        for (let ttmp = gf.ftrap; ttmp; ttmp = ttmp.ntrap) {
            if (ttmp.ttyp === MAGIC_PORTAL) {
                let du = distu(ttmp.tx, ttmp.ty);
                if (du <= 9)
                    pline("%s hot!", Tobjnam(amu, "feel"));
                else if (du <= 64)
                    pline("%s very warm.", Tobjnam(amu, "feel"));
                else if (du <= 144)
                    pline("%s warm.", Tobjnam(amu, "feel"));
                /* else, the amulet feels normal */
                break;
            }
        }
    }

    /* C wizard.c:89 — `if (!svc.context.no_of_wizards) return;`.  In js/ the
     * C svc.context.no_of_wizards counter lives on game.context (makemon +1,
     * wizdeadorgone -1); game.svc.context is a different mirror object
     * (current_fruit, made_amulet, ...) that never carries it, so reading it
     * here returned early every turn and the wizard-wake rn2(40) (wizard.c:95)
     * was never drawn once a sleeping Wizard reached the hero's level. */
    if (!gf.context || !gf.context.no_of_wizards)
        return;
    /* find Wizard, and wake him if necessary */
    for (let mtmp = gf.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.iswiz && mtmp.msleeping && !rn2(40)) {
            mtmp.msleeping = 0;
            if (!m_next2u(mtmp))
                await You(
      "get the creepy feeling that somebody noticed your taking the Amulet.");
            return;
        }
    }
}

/* C wizard.c:784-808 — periodic harassment after killing the Wizard or
 * performing the invocation. Astral excludes cases 0 and 5, so its selector
 * is rnd(4), not rn2(6). */
export async function intervene() {
    const which = Is_astralevel(game.u.uz) ? rnd(4) : rn2(6);
    switch (which) {
    case 0:
    case 1:
        await pline((wizard_Unaware() ? 'You dream that you feel ' : 'You feel ')
                    + 'vaguely nervous.');
        break;
    case 2:
        if (!_vision_Blind())
            await You('notice a %s glow surrounding you.', hcolor(NH_BLACK));
        await rndcurse();
        break;
    case 3:
        aggravate();
        break;
    case 4:
        await nasty(null);
        break;
    case 5:
        await resurrect();
        break;
    }
}

/* C wizard.c:814-822 — also called when a living Wizard leaves the dungeon.
 * Later removals decrement the count but do not restart an existing timer. */
export function wizdeadorgone() {
    game.context.no_of_wizards = (game.context.no_of_wizards | 0) - 1;
    const u = game.u;
    if (!u.uevent.udemigod) {
        u.uevent.udemigod = 1;
        u.udg_cnt = rn1(250, 50);
    }
}

export async function resurrect() {
    const g = game, u = g.u;
    let mtmp = null;
    let verb = 'kill';

    if (!(g.context?.no_of_wizards | 0)) {
        /* make a new Wizard */
        mtmp = await makemon(PM_WIZARD_OF_YENDOR,
                                   u.ux | 0, u.uy | 0, MM_NOWAIT);
        /* affects experience; he's not coming back from a corpse but is
           subject to repeated killing like a revived corpse */
        if (mtmp)
            mtmp.mrevived = 1;
    } else {
        /* look for a migrating Wizard (wizard.c:729-758) */
        verb = 'elude';
        let prev = null;
        while ((mtmp = prev ? prev.nmon : g.migrating_mons) != null) {
            let elapsed;
            if (mtmp.iswiz
                /* if he has the Amulet, he won't bring it to you */
                && !mon_has_amulet(mtmp)
                && (elapsed = (g.moves | 0) - (mtmp.mlstmv | 0)) > 0) {
                mon_catchup_elapsed_time(mtmp, elapsed);
                if (elapsed >= LARGEST_INT)
                    elapsed = LARGEST_INT - 1;
                elapsed = Math.trunc(elapsed / 50);
                if (mtmp.msleeping && rn2(elapsed + 1))
                    mtmp.msleeping = 0;
                if (mtmp.mfrozen === 1) /* would unfreeze on next move */
                    mtmp.mfrozen = 0, mtmp.mcanmove = 1;
                if (!helpless(mtmp)) {
                    if (prev) prev.nmon = mtmp.nmon;
                    else g.migrating_mons = mtmp.nmon;
                    await mon_arrive(mtmp, -1); /* -1: Wiz_arrive (dog.c) */
                    /* mx: mon_arrive() might have sent mtmp into limbo */
                    if (!mtmp.mx)
                        mtmp = null;
                    break;
                }
            }
            prev = mtmp;
        }
    }

    if (mtmp) {
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
        mtmp.mtame = 0;
        mtmp.mpeaceful = 0;
        set_malign(mtmp);
        /* C wizard.c:774; Deaf includes HDeaf and roleplay deafness
         * (youprop.h:125), as read by the shared helper. */
        if (!_hero_Deaf()) {
            await pline('A voice booms out...');
            SetVoice(mtmp, 0, 80, 0);
            await verbalize(`So thou thought thou couldst ${verb} me, fool.`);
        }
    }
}
