// read.js — the 'r' command.
// C ref: src/read.c
//
// The spellbook route is live (doread -> study_book); scroll effects need
// seffects and stay recorded after their prompt keys are consumed.

import { game } from './gstate.js';
import { getobj, GETOBJ_PROMPT, ECMD_TIME, ECMD_OK } from './invent.js';
import { ECMD_CANCEL, SPE_LIM, CORR, Is_rogue_level } from './const.js';
import { sgn } from './hacklib.js';
import { chwepon } from './wield.js';
import { erosion_matters } from './mkobj.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { pline } from './display.js';
import { rn2, rnd } from './rng.js';
import { getlin } from './cmd.js';
import { name_to_monplus } from './mondata.js';
import { makemon } from './makemon.js';
import { canseemon } from './display.js';
import { Amonnam } from './do_name.js';
import { MM_NOEXCLAM } from './const.js';
import { study_book } from './spell.js';
import { do_mapping } from './detect.js';
import { do_clear_area, vision_recalc } from './vision.js';
import { makeknown } from './o_init.js';
import { more_experienced } from './exper.js';
import { You } from './pline.js';
import { useup, identify_pack } from './invent.js';
import { exercise } from './attrib.js';
import { A_WIS } from './const.js';

function note_unported_read(what) {
    (game.unported ||= new Set()).add('read:' + what);
}

// src/read.c:315 read_ok() — getobj filter for 'r'; lives in js/cmd.js
// beside the other command filters and is passed in by the caller.

// src/read.c:330 doread()
export async function doread(read_ok) {
    const scroll = await getobj('read', read_ok, GETOBJ_PROMPT);
    if (!scroll)
        return ECMD_CANCEL;
    const otyp = scroll.otyp;
    scroll.pickup_prev = 0;

    /* fortune cookie / shirts / candy wrapper arms */
    if (otyp === ONAMES.FORTUNE_COOKIE || otyp === ONAMES.T_SHIRT
        || otyp === ONAMES.ALCHEMY_SMOCK || otyp === ONAMES.HAWAIIAN_SHIRT
        || otyp === ONAMES.APRON || otyp === ONAMES.CANDY_BAR) {
        note_unported_read('doread:novelty_text');
        return ECMD_TIME;
    }
    if (scroll.oclass !== OCLASSES.SCROLL_CLASS
        && scroll.oclass !== OCLASSES.SPBOOK_CLASS) {
        await pline("That is a silly thing to read.");
        return ECMD_OK;
    }
    if (game.u.ublind && otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD) {
        note_unported_read('doread:blind');
        return ECMD_OK;
    }

    /* literate conduct bump — no draw, no message */
    game.u.uconduct = game.u.uconduct || {};
    game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;

    if (scroll.oclass === OCLASSES.SPBOOK_CLASS)
        return (await study_book(scroll)) ? ECMD_TIME : ECMD_OK;

    /* src/read.c:617 — the scroll path. Blind and confused readings need
       state no session reaches yet. */
    game.known = false;
    const nodisappear = (otyp === ONAMES.SCR_FIRE
                         || (otyp === ONAMES.SCR_REMOVE_CURSE
                             && scroll.cursed));
    await pline(nodisappear ? 'You read the scroll.'
                            : 'As you read the scroll, it disappears.');

    if (!await seffects(scroll)) {
        if (!game.objects[otyp].oc_name_known) {
            if (game.known)
                learnscroll(scroll);
            /* else trycall() asks for a name; not reachable while known
               stays false only for effectless scrolls we record */
        }
        if (otyp !== ONAMES.SCR_BLANK_PAPER)
            useup(scroll);
    }
    return ECMD_TIME;
}

// src/read.c:308 learnscroll() — reading identifies the scroll type.
function learnscroll(sobj) {
    /* it's implied hero became literate */
    makeknown(sobj.otyp);
}

// src/read.c:2263 seffects() — scroll effects, one arm per type. Only
// magic mapping is live; every other scroll records with its otyp so the
// gap is visible per type. Returns true when the scroll was already used
// up by its own arm.
async function seffects(sobj) {
    const otyp = sobj.otyp;

    /* src/read.c:2199 — "just for trying": any magical scroll exercises
       wisdom before its effect, the same dispatcher prologue weffects has */
    if (game.objects[otyp].oc_magic)
        exercise(A_WIS, true);

    switch (otyp) {
    case ONAMES.SCR_MAGIC_MAPPING:
    case ONAMES.SPE_MAGIC_MAPPING:
        await seffect_magic_mapping(sobj);
        break;
    case ONAMES.SCR_TELEPORTATION:
    case ONAMES.SPE_TELEPORT_AWAY:
        await seffect_teleportation(sobj);
        break;
    case ONAMES.SCR_IDENTIFY:
        return await seffect_identify(sobj);
    case ONAMES.SCR_ENCHANT_WEAPON:
        return await seffect_enchant_weapon(sobj);
    case ONAMES.SCR_LIGHT:
        return await seffect_light(sobj);
    default:
        note_unported_read(`seffects:otyp=${otyp}`);
        break;
    }
    return false;
}

// src/read.c:58 learnscrolltyp() — learning a scroll type is worth 10 score.
function learnscrolltyp(scrolltyp) {
    if (!game.objects[scrolltyp].oc_name_known) {
        makeknown(scrolltyp);
        more_experienced(0, 10);
        return true;
    }
    return false;
}

// src/read.c seffect_light() — the scroll of light.
//
// The confused arm makes yellow/black lights, which needs makemon with
// MM_EDOG plus initedog; recorded. The ordinary arm is live.
async function seffect_light(sobj) {
    const scursed = sobj.cursed;
    const confused = !!(game.u?.intrinsic?.HConfusion
                        || game.u?.uprops?.CONFUSION);

    if (!confused) {
        if (!game.u.ublind)
            game.known = true;
        await litroom(!scursed, sobj);
        if (!scursed) {
            /* lightdamage(sobj, TRUE, 5): the gremlin arm is the only one
               with draws or effect, and the hero is never a gremlin here */
            if (5)
                game.known = true;
        }
    } else {
        note_unported_read('seffect_light:confused_lights');
    }
    return false;
}

// src/read.c set_lit() — do_clear_area()'s callback.
//
// The gremlin collection list is recorded: it only matters when a gremlin is
// standing in the lit area, and light_hits_gremlin's rnd(5) would be a draw.
function set_lit(x, y, val) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if (val) {
        loc.lit = 1;
        const mtmp = (game.level?.monsters || [])
            .find(m => m.mx === x && m.my === y && m.mhp > 0);
        if (mtmp && mtmp.data?.mname === 'gremlin')
            note_unported_read('set_lit:gremlin');
    } else {
        loc.lit = 0;
        note_unported_read('set_lit:snuff_light_source');
    }
}

// src/read.c:2491 litroom() — light (on) or darken (!on) the hero's area.
//
// Radius is 5, or 9 for a blessed scroll. The darkening arm needs
// snuff_lit/artifact_light over the inventory and is recorded; the lighting
// arm is what a scroll of light reaches.
export async function litroom(on, obj) {
    const blessed_effect = !!(obj && obj.oclass === OCLASSES.SCROLL_CLASS
                              && obj.blessed);
    const no_op = !!game.u.uswallow;    /* Underwater/waterlevel not modelled */

    /* update object lights and produce message (provided you're not blind) */
    if (!on) {
        note_unported_read('litroom:darken');
        return;
    }
    if (blessed_effect)
        /* impact_arti_light over lamplit artifacts; none exist yet */
        note_unported_read('litroom:blessed_arti_light');

    if (game.u.uswallow) {
        note_unported_read('litroom:swallowed');
    } else if (!game.u.ublind
               && (!Is_rogue_level(game.u.uz)
                   || game.level?.at(game.u.ux, game.u.uy)?.typ !== CORR)) {
        await pline(`A lit field ${no_op ? 'briefly ' : ''}surrounds you!`);
    }

    /* No-op when swallowed or in water */
    if (no_op)
        return;

    do_clear_area(game.u.ux, game.u.uy, blessed_effect ? 9 : 5,
                  set_lit, on ? 1 : 0);

    /*
     *  If we are not blind, then force a redraw on all positions in sight
     *  by temporarily blinding the hero. The vision recalculation will
     *  correctly update all previously seen positions *and* correctly set
     *  the waslit bit.
     */
    if (!game.u.ublind)
        vision_recalc(2);

    game.vision_full_recalc = 1;        /* delayed vision recalculation */
}

// src/read.c:1627 seffect_enchant_weapon() — the scroll of enchant weapon.
//
// The confused arm rustproofs the weapon instead of enchanting it, and returns
// before chwepon(); erosion_matters() plus the ARMOR_CLASS exclusion is what
// keeps it to actual weapons. `s` guards its own uwep tests against a null
// pointer, which is why the !uwep case yields 1 rather than reading uwep->spe.
async function seffect_enchant_weapon(sobj) {
    const scursed = sobj.cursed;
    const confused = !!(game.u?.intrinsic?.HConfusion
                        || game.u?.uprops?.CONFUSION);
    const sblessed = sobj.blessed;
    const uwep = game.u.uwep;
    let s;

    /* [What about twoweapon mode?  Proofing/repairing/enchanting both
       would be too powerful, but shouldn't we choose randomly between
       primary and secondary instead of always acting on primary?] */
    if (confused && uwep && erosion_matters(uwep, game.objects)
        && uwep.oclass !== OCLASSES.ARMOR_CLASS) {
        note_unported_read('seffect_enchant_weapon:erodeproof');
        return false;
    }
    s = scursed ? -1
        : !uwep ? 1                     /* guard the tests below against null */
        : (uwep.spe >= 9) ? (rn2(uwep.spe) === 0)  /* usually 0, maybe 1 */
        : sblessed ? rnd(3 - Math.trunc(uwep.spe / 3)) /* >=9 prevents rnd(0) */
        : 1;                            /* uncursed */
    /* nothing enchanted: strange_feeling -> useup */
    const used_up = !(await chwepon(sobj, s));
    if (uwep)
        cap_spe(uwep);
    return used_up;
}

// src/read.c cap_spe() — clamp enchantment to the +/-SPE_LIM band.
function cap_spe(obj) {
    if (obj) {
        if (Math.abs(obj.spe) > SPE_LIM)
            obj.spe = sgn(obj.spe) * SPE_LIM;
    }
}

// src/read.c:2055 seffect_identify() — the scroll arm.
//
// The scroll is used up BEFORE the messages, and the cval roll only happens
// on the blessed or lucky path: `sblessed || (!scursed && !rn2(5))`, so an
// ordinary uncursed scroll spends one rn2(5) and usually identifies one item.
// identify_pack's menu needs the inventory-selection path and is recorded.
// Returns true because the scroll has already been used up.
async function seffect_identify(sobj) {
    const otyp = sobj.otyp;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION?.intrinsic
                     || !!game.u.intrinsic?.HConfusion;
    const already_known = !!game.objects[otyp].oc_name_known;

    useup(sobj);

    if (confused || (scursed && !already_known))
        await You('identify this as an identify scroll.');
    else if (!already_known)
        await pline('This is an identify scroll.');
    if (!already_known)
        learnscrolltyp(ONAMES.SCR_IDENTIFY);
    if (confused || (scursed && !already_known))
        return true;

    if ((game.invent || []).length) {
        let cval = 1;
        if (sblessed || (!scursed && !rn2(5))) {
            cval = rn2(5);
            /* note: if cval==0, identify all items */
            if (cval === 1 && sblessed && (game.u.uluck | 0) > 0)
                ++cval;
        }
        await identify_pack(cval, !already_known);
    }
    return true;
}

// src/read.c:2015 seffect_teleportation()
async function seffect_teleportation(sobj) {
    const scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION?.intrinsic
                     || !!game.u.intrinsic?.HConfusion;

    if (confused || scursed) {
        const { level_tele } = await import('./teleport.js');
        await level_tele();
        /* gives "materialize on different/same level!" message, must
           be a teleport scroll */
        game.known = true;
    } else {
        /* scrolltele(): getpos-controlled or random in-level teleport;
           not ported yet — recorded so the gap is visible */
        note_unported_read('seffect_teleportation:scrolltele');
    }
}

// src/read.c:2100 seffect_magic_mapping()
async function seffect_magic_mapping(sobj) {
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION?.intrinsic;

    if (game.level?.flags?.nommap) {
        note_unported_read('seffect_magic_mapping:nommap');
        return;
    }
    if (sblessed)
        note_unported_read('seffect_magic_mapping:blessed_reveal');
    game.known = true;

    await pline('A map coalesces in your mind!');
    const cval = (scursed && !confused);
    if (cval)
        note_unported_read('seffect_magic_mapping:cursed_confusion');
    /* notice_mon_off/_on wrap the mapping so newly drawn monsters are not
       announced */
    do_mapping();
}


// src/read.c:3372 create_particular() — the wizard-mode monster maker.
//
// The recorded uses type a plain monster name, so what is ported is the
// prompt/getlin loop, the name lookup and the makemon. The modifier prefixes
// (a leading count, "saddled ", "sleeping ", "invisible ", "hidden ", the
// tame/peaceful/hostile words and the gender terms) are recorded, as is the
// monster-class and random-monster syntax.
export async function create_particular() {
    const CP_TRYLIM = 5;
    let tryct = CP_TRYLIM, altmsg = 0;
    let prompt = 'Create what kind of monster?';

    do {
        const buf = await getlin(prompt);
        if (buf === null || buf === '\x1b')
            return false;
        const bufp = buf.trim().replace(/\s+/g, ' ');

        /* create_particular_parse()'s modifier scan is recorded; the plain
           "<monster name>" form is the one every recorded use takes. */
        if (/^\d|saddled |sleeping |invisible |hidden |tame |peaceful |hostile |male |female /.test(bufp))
            note_unported_read('create_particular:modifiers');

        const box = {};
        const mndx = name_to_monplus(bufp, box);
        if (mndx !== undefined && mndx !== null && mndx >= 0) {
            /* MM_NOEXCLAM: "<mon> appears." rather than "appears!" */
            const mtmp = makemon(game.mons[mndx], game.u.ux, game.u.uy,
                                 MM_NOEXCLAM);
            /* src/makemon.c:1472 — C announces the arrival from inside
               makemon(), which cannot print here because our makemon is
               sync and has 23 call sites. The message is emitted at this
               caller instead; the other callers do not announce yet. */
            if (mtmp && canseemon(mtmp)) {
                const near = (Math.abs(mtmp.mx - game.u.ux) <= 1
                              && Math.abs(mtmp.my - game.u.uy) <= 1);
                await pline(`${Amonnam(mtmp)} appears${
                    near ? ' next to you' : ''}.`);
            }
            return true;
        }

        /* no good; try again... */
        if (bufp || altmsg || tryct < 2) {
            await pline("I've never heard of such monsters.");
        } else {
            await pline('Try again (type * for random, ESC to cancel).');
            ++altmsg;
        }
        if (tryct === CP_TRYLIM)
            prompt += ' [type name or symbol]';
    } while (--tryct > 0);

    return false;
}

// src/wizcmds.c:203 wiz_genesis() — the ^G command.
export async function wiz_genesis() {
    if (game.wizard) {
        const mongen_saved = game.iflags?.debug_mongen;
        if (game.iflags) game.iflags.debug_mongen = false;
        await create_particular();
        if (game.iflags) game.iflags.debug_mongen = mongen_saved;
    } else {
        note_unported_read('wiz_genesis:unavailcmd');
    }
    return ECMD_OK;
}
