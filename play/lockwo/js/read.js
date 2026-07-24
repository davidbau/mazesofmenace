// read.js — reading scrolls and spellbooks.
// C ref: read.c.  Ports the 'r' command entry (doread), the scroll dispatch
// (seffects) for the magic-mapping case, and spellbook reading (study_book)
// for the "already know it well" branch exercised by the gameplay sessions.

import { game } from './gstate.js';
import { rnd, rn2 } from './rng.js';
import { pline, topl_more, update_topl } from './display.js';
import { getobj, makeknown, useup, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY,
         GETOBJ_EXCLUDE, GETOBJ_PROMPT, identify_pack } from './invent.js';
import { exercise } from './attrib.js';
import { discover_object } from './o_init.js';
import { do_mapping } from './detect.js';
import { study_book } from './spell.js';
import { SCROLL_CLASS, SPBOOK_CLASS, SCR_BLANK_PAPER, SCR_TELEPORTATION,
         objects } from './mkobj.js';
import { A_WIS, CORR, Is_rogue_level, Is_waterlevel } from './const.js';
import { Blind } from './vision.js';

const ECMD_CANCEL = 0;
const ECMD_OK = 0;
const ECMD_TIME = 1;

const SCR_MAGIC_MAPPING = 337;
const SCR_IDENTIFY = 336;
const SCR_LIGHT = 332;

// C ref: topl.c — within a single turn, consecutive plines concatenate on the
// top line (separated by two spaces) until it would overflow.  pline() itself
// replaces, so this helper appends to whatever is already pending.
async function pline_append(msg) {
    const cur = game._pending_message || '';
    if (cur && (cur.length + 2 + msg.length) <= 80)
        game._pending_message = `${cur}  ${msg}`;
    else
        await pline(msg);
    // The appended message is now the unacknowledged top line; mark it so a
    // following update_topl() (e.g. identify_pack's report) pages it with
    // --More-- when the two don't fit.  C ref: topl.c TL_HAS_MESSAGE.
    game._toplin = 1;
}

// C ref: objects.h — inherently-magical scrolls (oc_magic bit).  The JS object
// table doesn't carry oc_magic separately, so the magic scroll types that gate
// seffects' "exercise A_WIS for trying" are listed here.  (Non-magic scrolls:
// blank paper, mail.)
const NONMAGIC_SCROLLS = new Set([SCR_BLANK_PAPER]);
function scroll_is_magic(otyp) { return !NONMAGIC_SCROLLS.has(otyp); }

// C ref: youprop.h Confusion — the hero's confusion timer (uprops[CONFUSION]),
// as read by the status line's "Conf" indicator (display.js).
function Confused() { return (game.u?.uprops?.Confusion || 0) > 0; }

// C ref: mondata.c can_chant(&youmonst) — whether the hero can speak the words
// (for casting / reading aloud).  FALSE only when strangled, silent, headless,
// or a buzzing/burbling form.  The recorded heroes are ordinary humanoids, so
// only Strangled can make this FALSE ("misunderstand" instead of "mispronounce");
// the polymorphed-into-a-silent-form cases aren't exercised.
function can_chant() {
    return !game.u?.Strangled;
}

// C ref: read.c read_ok — getobj callback: scrolls and spellbooks suggested;
// anything else is downplayed (selectable but not listed).
function read_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

// C ref: read.c seffects — apply a scroll (or fake-spellbook) effect.  Magic
// scrolls exercise Wisdom "just for trying" (rn2(19) via exercise) before the
// per-type effect.  Returns true if the object was consumed inside seffects.
async function seffects(sobj) {
    const otyp = sobj.otyp;
    if (scroll_is_magic(otyp))
        exercise(A_WIS, true);

    switch (otyp) {
    case SCR_MAGIC_MAPPING:
        game.known = true;
        // C tty concatenates same-turn toplines: "...disappears.  A map ...".
        await pline_append('A map coalesces in your mind!');
        await do_mapping();
        break;
    case SCR_LIGHT:
        // C ref: read.c seffect_light — non-confused, non-blind: mark known and
        // light the area (litroom).  lightdamage only rolls RNG when the hero is
        // a gremlin (not exercised), so the read consumes no extra PRNG here.
        if (!Confused()) {
            if (!Blind()) game.known = true;
            await litroom(!sobj.cursed, sobj);
        }
        break;
    case SCR_IDENTIFY:
        await seffect_identify(sobj);
        return true; // seffect_identify uses up the scroll itself
    case SCR_TELEPORTATION:
        // C ref: read.c seffect_teleportation — a confused or cursed scroll does
        // a level teleport (level_tele); an ordinary one does an in-level
        // teleport (scrolltele, not exercised).  level_tele sets gk.known.
        if (Confused() || sobj.cursed) {
            const { level_tele } = await import('./do.js');
            const { hooked_tty_getlin } = await import('./extcmd-handlers.js');
            await level_tele((q) => hooked_tty_getlin(q, null));
        }
        // (uncursed, unconfused scrolltele is not exercised: no-op)
        break;
    default:
        // Uncovered scroll effects: no-op (object still consumed by doread).
        break;
    }
    return false;
}

// C ref: read.c litroom(on, obj) — the scroll-of-light "on" path (blessed or
// uncursed).  Not swallowed, not blind, not a rogue-level corridor: announce
// "A lit field surrounds you!" (the no-op swallowed/underwater/water-level
// forms print "briefly").  C then lights every couldsee cell within radius
// (do_clear_area + set_lit, 9 for a blessed scroll else 5) and forces a
// redraw (vision_recalc) so newly-lit corridor cells outside the hero's own
// room become visible immediately.  No RNG either way.  The rogue-level
// whole-room relight, Sunsword-invoke, and cursed-darkening paths are not
// exercised by the covered starts.
async function litroom(on, obj) {
    if (!on) return; // cursed-scroll darkening not exercised
    const u = game.u;
    const no_op = !!(u?.uswallow || u?.uprops?.Underwater || Is_waterlevel(u?.uz));
    const loc0 = game.level?.at(u.ux, u.uy);
    if (!u?.uswallow && !Blind()
        && !(Is_rogue_level(u.uz) && loc0?.typ === CORR))
        await pline_append(`A lit field ${no_op ? 'briefly ' : ''}surrounds you!`);

    if (no_op || Is_rogue_level(u.uz)) return;

    const blessed_effect = !!(obj?.oclass === SCROLL_CLASS && obj.blessed);
    const { do_clear_area, vision_recalc } = await import('./vision.js');
    do_clear_area(u.ux, u.uy, blessed_effect ? 9 : 5, (x, y) => {
        const loc = game.level?.at(x, y);
        if (loc) loc.lit = 1;
    });
    if (!Blind()) vision_recalc(0);
}

// C ref: read.c seffect_identify() — the scroll-of-identify effect.  The scroll
// is used up FIRST (so it's gone before the empty-inventory check), then for a
// not-yet-known identify it announces "This is an identify scroll." and learns
// the type (makeknown -> discover_object credit_hero => a second A_WIS
// exercise, the rn2(19) the RNG trace shows).  An uncursed/unblessed scroll
// then rolls rn2(5): on a 0 it rolls a second rn2(5) for the count (cval, 0 =>
// identify everything); otherwise cval stays 1.  identify_pack reports the
// result.  Returns nothing; the caller treats it as "scroll consumed".
async function seffect_identify(sobj) {
    const otyp = sobj.otyp;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!game.u?.Confusion;
    const already_known = !!objects[otyp]?.oc_name_known;

    // C: use up the scroll before learnscrolltyp()/empty-invent check.
    useup(sobj);

    if (confused || (scursed && !already_known)) {
        await pline_append('You identify this as an identify scroll.');
    } else if (!already_known) {
        await pline_append('This is an identify scroll.');
    }
    if (!already_known) {
        // learnscrolltyp -> makeknown -> discover_object(credit_hero=TRUE):
        // names the type, exercises A_WIS, and grants reading experience.
        if (!objects[otyp]?.oc_name_known) {
            discover_object(otyp, true, true);
            exercise(A_WIS, true);
            more_experienced(0, 10);
        }
    }
    if (confused || (scursed && !already_known)) return;

    if (game.invent && game.invent.length) {
        let cval = 1;
        if (sblessed || (!scursed && rn2(5) === 0)) {
            cval = rn2(5);
            // C: if (cval == 1 && sblessed && Luck > 0) ++cval;
            if (cval === 1 && sblessed && (game.u?.uluck || 0) > 0) ++cval;
        }
        await identify_pack(cval, !already_known);
    } else {
        await pline_append('You\'re not carrying anything else to be identified.');
    }
}

// C ref: exper.c more_experienced(exper, rexp) — add to experience/score; no
// RNG, level-up is checked separately.  Reading an identify scroll grants
// rexp 10 (no exp points), which never triggers a level change here.
function more_experienced(exper, rexp) {
    const u = game.u;
    if (!u) return;
    u.uexp = (u.uexp || 0) + exper;
    u.urexp = (u.urexp || 0) + 4 * exper + rexp;
}

// C ref: read.c doread — the 'r' command.  Pick a scroll or spellbook, then
// read it.  Only the scroll and spellbook branches are ported; exotic readables
// (cookies, shirts, cards, ...) are not exercised.
export async function doread() {
    const scroll = await getobj('read', read_ok, GETOBJ_PROMPT);
    if (!scroll)
        return ECMD_CANCEL;
    const otyp = scroll.otyp;

    if (scroll.oclass !== SCROLL_CLASS && scroll.oclass !== SPBOOK_CLASS) {
        await pline('That is a silly thing to read.');
        return ECMD_OK;
    }

    // literate conduct bookkeeping is score-only (no RNG), omitted.

    if (scroll.oclass === SPBOOK_CLASS) {
        return (await study_book(scroll)) ? ECMD_TIME : ECMD_OK;
    }

    scroll.in_use = true;
    if (otyp !== SCR_BLANK_PAPER) {
        // Not blind on the covered starts.
        await pline('As you read the scroll, it disappears.');
        // C ref: read.c doread — a confused hero garbles the words.  This
        // pline follows the "disappears" line on the same turn; when the two
        // don't fit on one top line, "...disappears." is paged with --More--
        // (its own captured frame) before the confused line replaces it.
        // Route through update_topl (marking the prior line NEED_MORE) so that
        // paging happens exactly as C's topl.c does.  Hallucination ("Being so
        // trippy, you screw up...") is not exercised.
        if (Confused()) {
            const silently = !can_chant();
            game._toplin = 1;
            await update_topl(
                `Being confused, you ${silently ? 'misunderstand' : 'mispronounce'} the magic words...`);
        }
    }

    if (!(await seffects(scroll))) {
        if (!objects[otyp]?.oc_name_known) {
            // C ref: read.c doread -> learnscroll -> learnscrolltyp():
            // makeknown() + more_experienced(0, 10) (score-only, no RNG).
            if (game.known) { makeknown(otyp); more_experienced(0, 10); }
            // trycall(scroll): naming prompt, not modeled.
        }
        scroll.in_use = false;
        if (otyp !== SCR_BLANK_PAPER)
            useup(scroll);
    }

    // C ref: allmain.c moveloop_core():538 — `if (u.utotype) deferred_goto();`
    // runs right after rhack() returns, i.e. after the scroll is discovered
    // (makeknown -> exercise(A_WIS) rn2(19)) and used up.  A confused/cursed
    // teleport scroll scheduled a level change (level_tele); fire it now so
    // mklev() follows the discovery exercise in the PRNG stream, exactly as C.
    if (game._lvltport_dest) {
        const { run_deferred_lvltport } = await import('./do.js');
        await run_deferred_lvltport();
    }
    return ECMD_TIME;
}
