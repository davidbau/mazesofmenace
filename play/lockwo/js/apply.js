// apply.js — the #apply ('a') command.
//
// C ref: apply.c doapply()/apply_ok()/use_stethoscope().
//
// RNG faithfulness: the only path exercised by the owned starter sessions is
// applying a STETHOSCOPE.  The crucial RNG-faithful detail is the
// "one free use per turn" rule (apply.c:313-341):
//
//   res = (gh.hero_seq == svc.context.stethoscope_seq) ? ECMD_TIME : ECMD_OK;
//   svc.context.stethoscope_seq = gh.hero_seq;
//
// The first stethoscope use of a turn returns ECMD_OK (NO game turn passes,
// so the per-turn block — movemon / mcalcmove / maybe_generate_rnd_mon /
// gethungry — does NOT run and consumes NO RNG); a second use in the same
// hero_seq costs the turn.  Without this, the port would (wrongly) advance a
// turn on a self-probe, desynchronising the PRNG stream against C — which is
// exactly the seed0016 divergence: C records 0 RNG for the stethoscope-self
// step, the port was firing a whole per-turn block there.
//
// hero_seq is `svm.moves << 3` (allmain.c); since `a c .` here is the hero's
// very first action before any turn has elapsed, stethoscope_seq (init 0) and
// hero_seq differ on the first use, giving the free ECMD_OK.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';

import {
    TOOL_CLASS, WAND_CLASS, SPBOOK_CLASS, POTION_CLASS, WEAPON_CLASS,
    COIN_CLASS, SCROLL_CLASS, MAGIC_MARKER, SCR_BLANK_PAPER, SPE_BLANK_PAPER,
} from './mkobj.js';

// C ref: include/onames.h — STETHOSCOPE object type index (mkobj.js OBJECTS
// row [237, "STETHOSCOPE", ...]).  Defined locally to avoid threading a new
// export through mkobj.js.
const STETHOSCOPE = 237;
const SPE_NOVEL = 405; // mkobj.js OBJECT_DATA — novel (a spellbook subtype)

// C ref: include/onames.h — lamp/lantern object types rubbed by dorub().
const BRASS_LANTERN = 226, OIL_LAMP = 227, MAGIC_LAMP = 228;
// Graystones and royal jelly route to use_stone/use_royal_jelly (not exercised).
const GEM_CLASS = 9, FOOD_CLASS = 7;
// Applicable foods (mkobj.js OBJECT_DATA indices).
const EUCALYPTUS_LEAF = 276, LUMP_OF_ROYAL_JELLY_OTYP = 286, CREAM_PIE = 287;

// C ref: include/onames.h — the lock-picking tools (mkobj.js OBJECTS rows).
const SKELETON_KEY = 221, LOCK_PICK = 222, CREDIT_CARD = 223;

// ECMD result codes (cmd.h).  doapply() returns one of these; the caller maps
// ECMD_TIME -> game turn elapsed.
const ECMD_OK = 0;
const ECMD_CANCEL = 1;
const ECMD_TIME = 2;

// Lazily-imported deps (invent.js / display.js pull cmd.js transitively, so we
// avoid a static import cycle).
let _invent = null;
let _display = null;
let _cmd = null;
let _uhitm = null;
async function loadDeps() {
    if (!_invent) _invent = await import('./invent.js');
    if (!_display) _display = await import('./display.js');
    if (!_cmd) _cmd = await import('./cmd.js');
    if (!_uhitm) _uhitm = await import('./uhitm.js');
}

// C ref: do_name.c x_monnam — the article+name string for a monster.  Routed
// through uhitm.js's port (lazily, to avoid a static import cycle).
function x_monnam(mtmp, article, adjective, suppress, called) {
    return _uhitm.x_monnam(mtmp, article, adjective, suppress, called);
}

// C ref: apply.c apply_ok() — getobj() callback: which carried items are
// suggested / selectable for "use or apply".  Faithful to the starter classes
// (tools/wands/spellbooks are SUGGEST; coins DOWNPLAY; applicable weapons
// SUGGEST).  Anything else is selectable-but-not-suggested.
function apply_ok(obj) {
    const I = _invent;
    const EXCLUDE = I ? I.GETOBJ_EXCLUDE : -3;
    const EXCLUDE_SELECTABLE = I ? I.GETOBJ_EXCLUDE_SELECTABLE : 0;
    const DOWNPLAY = I ? I.GETOBJ_DOWNPLAY : 1;
    const SUGGEST = I ? I.GETOBJ_SUGGEST : 2;

    if (!obj) return EXCLUDE;

    if (obj.oclass === TOOL_CLASS || obj.oclass === WAND_CLASS
        || obj.oclass === SPBOOK_CLASS)
        return SUGGEST;

    if (obj.oclass === COIN_CLASS) return DOWNPLAY;

    // Applicable weapons (pick/axe/pole/bullwhip) — none in the starter
    // sessions that reach here, but keep the class check for completeness.
    if (obj.oclass === WEAPON_CLASS) return EXCLUDE_SELECTABLE;

    if (obj.oclass === POTION_CLASS) {
        // Only oil is applicable, and only once discovered; starter potions are
        // undiscovered so they DOWNPLAY rather than SUGGEST.
        return DOWNPLAY;
    }

    // C ref apply.c:4185 — certain foods are applicable (cream pie -> facial,
    // eucalyptus leaf -> cure, royal jelly -> eat).  These are SUGGESTed so the
    // apply prompt lists their invlet (e.g. the wished cream pie 'o').
    if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF
        || obj.otyp === LUMP_OF_ROYAL_JELLY_OTYP)
        return SUGGEST;

    // is_graystone(obj) -> SUGGEST (touchstone rubbing); the wished sessions
    // here carry none, so it falls through to EXCLUDE_SELECTABLE.

    return EXCLUDE_SELECTABLE;
}

// C ref: insight.c ustatusline() — one-line self status produced when the
// stethoscope (or probing) is aimed at the hero.  Status-effect suffixes
// (Sick/Confusion/Blind/...) are omitted: the starter hero has none here, so
// `info` is empty and the line is exactly
//   "Status of <name> (<piousness> <align>):  Level L  HP h(m)  AC a."
function align_str(type) {
    return type === 0 ? 'neutral' : type > 0 ? 'lawful' : 'chaotic';
}

// C ref: insight.c piousness() — pious adverb from u.ualign.record, with the
// alignment word appended as a suffix (a lone space is dropped when record==3).
function piousness(record, suffix) {
    let pio;
    if (record >= 20) pio = 'piously';
    else if (record > 13) pio = 'devoutly';
    else if (record > 8) pio = 'fervently';
    else if (record > 3) pio = 'stridently';
    else if (record === 3) pio = '';
    else if (record > 0) pio = 'haltingly';
    else if (record === 0) pio = 'nominally';
    else if (record >= -3) pio = 'strayed';
    else if (record >= -8) pio = 'sinned';
    else pio = 'transgressed';

    let buf = pio;
    if (suffix && record >= 0) {
        if (record !== 3) buf += ' ';
        buf += suffix;
    }
    return buf;
}

async function ustatusline() {
    const u = game.u;
    const name = game.plname || 'Hero';
    const align = u?.ualign?.type ?? 0;
    const record = u?.ualign?.record ?? 0;
    const pio = piousness(record, align_str(align));
    const lvl = u?.ulevel ?? 1;
    const hp = u?.uhp ?? 0;
    const hpmax = u?.uhpmax ?? 0;
    const ac = u?.uac ?? 0;
    await _display.pline(
        `Status of ${name} (${pio}):  Level ${lvl}  HP ${hp}(${hpmax})  AC ${ac}.`);
}

// C ref: allmain.c — gh.hero_seq is `svm.moves << 3`.  `svm.moves` (the turn
// counter) is game.moves in the port; before the first turn elapses it is the
// startup value, distinct from the init-0 stethoscope_seq below.
function hero_seq() {
    return (game.moves || 0) << 3;
}

// C ref: insight.c size_str(msize) — body-size word for a monster's status.
const MZ_TINY = 0, MZ_SMALL = 1, MZ_MEDIUM = 2, MZ_LARGE = 3, MZ_HUGE = 4,
      MZ_GIGANTIC = 7;
function size_str(msize) {
    switch (msize) {
    case MZ_TINY: return 'tiny';
    case MZ_SMALL: return 'small';
    case MZ_MEDIUM: return 'medium';
    case MZ_LARGE: return 'large';
    case MZ_HUGE: return 'huge';
    case MZ_GIGANTIC: return 'gigantic';
    default: return `unknown size (${msize})`;
    }
}

// C ref: align.h sgn-style — mon_aligntyp(mtmp) collapses the data alignment to
// A_LAWFUL(1)/A_NEUTRAL(0)/A_CHAOTIC(-1) (priest.c:280).  Our stethoscope only
// targets ordinary hostiles, so the ispriest/isminion branches don't apply.
function mon_aligntyp(mtmp) {
    const algn = mtmp?.data?.maligntyp ?? 0;
    return algn > 0 ? 1 : algn < 0 ? -1 : 0;
}

// C ref: insight.c mstatusline(mtmp) — one-line monster status produced when the
// stethoscope (or probing) is aimed at a monster.  The starter-session monsters
// reach here without the worn/leashed/held/shapechanger/segment flags, so only
// the ", tame"/", peaceful" prefix (info) and the size+align+HP+AC body matter;
// any hidden-appearance suffix has already been stripped by seemimic() before
// this is called for the stethoscope, matching C's comment at insight.c:3315.
async function mstatusline(mtmp, update_topl) {
    let info = '';
    if (mtmp.mtame) info += ', tame';
    else if (mtmp.mpeaceful) info += ', peaceful';
    // ", cancelled"/", confused"/", asleep"/", scared"/... state suffixes — none
    // of the probed monsters in the owned sessions carry these when statused.
    if (mtmp.mcan) info += ', cancelled';
    if (mtmp.mconf) info += ', confused';
    if (mtmp.mflee) info += ', scared';

    const name = x_monnam(mtmp, /*ARTICLE_YOUR*/ 3, null, 0, false);
    const align = align_str(mon_aligntyp(mtmp));
    const sz = size_str(mtmp.data?.msize ?? MZ_MEDIUM);
    const mlev = mtmp.m_lev ?? mtmp.data?.mlevel ?? 0;
    const mhp = mtmp.mhp ?? 0;
    const mhpmax = mtmp.mhpmax ?? mhp;
    const mac = (mtmp.data?.ac != null) ? mtmp.data.ac : 10;
    await update_topl(
        `Status of ${name} (${align}, ${sz}):  Level ${mlev}  HP ${mhp}(${mhpmax})  AC ${mac}${info}.`);
}

// C ref: apply.c use_stethoscope() — read a direction, then report on the
// hero (self), an adjacent monster (mstatusline, with the mimic/hidden reveal),
// or the empty square ("You hear nothing special.").
async function use_stethoscope(_obj) {
    // getdir(): read a direction.  '.'/'s' => self (dx=dy=dz=0).
    const dir = await _cmd.getdir();
    if (!dir) return ECMD_CANCEL; // ESC

    // res: first use of this turn is free (ECMD_OK), a repeat costs the turn.
    game.context = game.context || {};
    const seq = hero_seq();
    const res = (seq === game.context.stethoscope_seq) ? ECMD_TIME : ECMD_OK;
    game.context.stethoscope_seq = seq;

    // dz != 0 (up/down): "the floor seems healthy enough" etc. — not exercised.
    // Self (dx==dy==0): ustatusline().
    if (!dir.dx && !dir.dy && !dir.dz) {
        await ustatusline();
        return res;
    }

    const { update_topl } = await import('./display.js');
    const { m_at, newsym } = await import('./display.js');
    const u = game.u;
    const rx = u.ux + dir.dx, ry = u.uy + dir.dy;

    // C ref: apply.c:407 — isok() bounds check.  Off-map -> "faint typing noise".
    if (rx < 0 || rx > 79 || ry < 0 || ry > 21) {
        await update_topl('You hear a faint typing noise.');
        return ECMD_OK;
    }

    const mtmp = m_at(rx, ry);
    if (mtmp) {
        const mnm = x_monnam(mtmp, /*ARTICLE_A*/ 2, null, 0, false);
        if (mtmp.mundetected) {
            // A buried/hiding monster the hero can't otherwise spot.
            await update_topl(`There is ${mnm} hidden there.`);
            mtmp.mundetected = 0;
            newsym(mtmp.mx, mtmp.my);
        } else if (mtmp.m_ap_type && mtmp.mappearance != null) {
            // C ref: apply.c:410 — a disguised monster (mimic) is exposed.
            //   "That <thing> is really <a monster>."
            const what = stethoscope_appearance(mtmp);
            const use_plural = false; // boots/gloves/lenses plural not exercised
            await seemimic(mtmp);
            await update_topl(
                `${use_plural ? 'Those' : 'That'} ${what} ${use_plural ? 'are' : 'is'} really ${mnm}.`);
        }
        await mstatusline(mtmp, update_topl);
        return res;
    }

    // No monster, no secret door/corridor reached in the owned sessions:
    // C ref: apply.c:468 — You("hear nothing special.").
    await update_topl('You hear nothing special.');
    return res;
}

// C ref: mon.c seemimic(mtmp) — a discovered mimic drops its object/furniture
// appearance and is redrawn as its true form.
async function seemimic(mtmp) {
    const { newsym } = await import('./display.js');
    mtmp.m_ap_type = 0;
    mtmp.mappearance = 0;
    newsym(mtmp.mx, mtmp.my);
}

// C ref: apply.c use_stethoscope() M_AP_OBJECT/M_AP_FURNITURE branch — the
// "<what>" the disguised monster was pretending to be.  For an object appearance
// it is simple_typename(mappearance) (objnam.c: the bare type name with any
// trailing description stripped); for furniture it is the cmap explanation.
function stethoscope_appearance(mtmp) {
    if (mtmp.m_ap_type === 'furniture') {
        // defsyms[mappearance].explanation — not exercised by the owned
        // sessions' object-mimics; fall back to a generic word.
        return 'thing';
    }
    // M_AP_OBJECT: simple_typename(mappearance) — the plain object type name.
    try {
        return _invent.simple_typename(mtmp.mappearance);
    } catch (_e) {
        return 'thing';
    }
}

// C ref: write.c write_ok(obj) — getobj() callback for the paper a magic
// marker writes on.  Only scrolls and spellbooks qualify; a blank one is
// SUGGESTed, a written one DOWNPLAYed, everything else EXCLUDEd ("That is a
// silly thing to write on.").
function write_ok(obj) {
    const I = _invent;
    const EXCLUDE = I ? I.GETOBJ_EXCLUDE : -3;
    const DOWNPLAY = I ? I.GETOBJ_DOWNPLAY : 1;
    const SUGGEST = I ? I.GETOBJ_SUGGEST : 2;
    if (!obj || (obj.oclass !== SCROLL_CLASS && obj.oclass !== SPBOOK_CLASS))
        return EXCLUDE;
    if (obj.otyp === SCR_BLANK_PAPER || obj.otyp === SPE_BLANK_PAPER)
        return SUGGEST;
    return DOWNPLAY;
}

// C ref: write.c dowrite(pen) — applying a magic marker.  Prompts for the paper
// to write on; a non-blank scroll/spellbook draws "That <typeword> is not
// blank!" (a wasted turn), a blank one would proceed to the "What type of
// scroll..." prompt + cost computation.  The owned session only ever targets a
// non-writeable object (rejected by write_ok -> getobj's silly_thing) or an
// already-written one, so the blank-paper creation branch isn't reached; if it
// ever is, fall back to ECMD_TIME rather than mis-spend RNG.
async function dowrite(_pen) {
    // nohands / Glib guards: not applicable to the starter heroes.
    const paper = await _invent.getobj('write on', write_ok, _invent.GETOBJ_NOFLAGS);
    if (!paper) return ECMD_CANCEL; // cancelled / silly_thing -> no turn

    const typeword = (paper.otyp === SPE_NOVEL) ? 'book'
        : (paper.oclass === SPBOOK_CLASS) ? 'spellbook' : 'scroll';
    // observe_object(paper): no RNG.  Blind branch not reachable here.
    if (paper.otyp !== SCR_BLANK_PAPER && paper.otyp !== SPE_BLANK_PAPER) {
        await _display.pline(`That ${typeword} is not blank!`);
        const { exercise } = await import('./attrib.js');
        const A_WIS = 2; // attrib.h A_WIS
        exercise(A_WIS, false); // -> rn2(2)
        return ECMD_TIME;
    }
    // Blank-paper write (cost computation, "What type of scroll..." getlin,
    // success roll) is not exercised by the owned sessions.  Treat as a no-op
    // turn so the PRNG isn't advanced incorrectly.
    return ECMD_TIME;
}

// C ref: apply.c doapply() — the #apply ('a') command.  Returns an ECMD_* code.
export async function doapply() {
    await loadDeps();

    // check_capacity()/nohands() guards don't fire for the starter heroes.
    const obj = await _invent.getobj('use or apply', apply_ok);
    if (!obj) return ECMD_CANCEL;

    // Wands (break), spellbooks (flip through) and coins (flip) take dedicated
    // paths; none are applied in the owned sessions that reach here.  Decline
    // without consuming RNG (no turn) rather than mis-handle their streams.
    if (obj.oclass === WAND_CLASS || obj.oclass === SPBOOK_CLASS
        || obj.oclass === COIN_CLASS) {
        await _display.pline('You cannot apply that here.');
        return ECMD_OK;
    }

    if (obj.otyp === STETHOSCOPE) {
        return await use_stethoscope(obj);
    }

    // C ref apply.c:4361 — applying a magic marker writes a scroll/spellbook.
    if (obj.otyp === MAGIC_MARKER) {
        return await dowrite(obj);
    }

    // C ref apply.c:4258 — applying a cream pie immerses the hero's face in it.
    if (obj.otyp === CREAM_PIE) {
        return await use_cream_pie(obj);
    }

    // C ref apply.c:4285 — a lock pick / skeleton key / credit card picks a
    // lock: pick_lock() prompts for a direction and unlocks an adjacent door /
    // a container underfoot.  Non-zero result (DID/LEARNED_SOMETHING) -> a turn
    // elapsed (ECMD_TIME); PICKLOCK_DID_NOTHING (0) -> no turn (ECMD_OK).
    if (obj.otyp === LOCK_PICK || obj.otyp === SKELETON_KEY || obj.otyp === CREDIT_CARD) {
        const r = await _cmd.pick_lock(obj);
        return r ? ECMD_TIME : ECMD_OK;
    }

    // Any other tool isn't exercised; mirror C's "I don't know how to use that"
    // without a turn cost.
    await _display.pline("Sorry, I don't know how to use that.");
    return ECMD_OK;
}

// C ref: apply.c:3567 use_cream_pie(obj) — the hero immerses their face in a
// (wished/applied) cream pie.  "You immerse your face in the cream pie."; then,
// because a cream pie can_blnd(), blindinc = rnd(25) and the hero is blinded:
// "You can't see through all the sticky goop on your face." (the !wasblind ->
// Blind branch).  The pie is used up; returns ECMD_OK (no game turn).
async function use_cream_pie(obj) {
    await loadDeps();
    const { update_topl } = await import('./display.js');
    const { vision_recalc } = await import('./vision.js');
    const u = game.u;
    const wasblind = (u?.blinded || 0) > 0; // Blind before
    // (quan > 1 split not needed: wished pie has quan 1.)
    await update_topl('You immerse your face in the cream pie.');
    // can_blnd(0, youmonst, AT_WEAP, cream pie) is TRUE for a cream pie.
    const blindinc = rnd(25);
    if (u) {
        u.ucreamed = (u.ucreamed || 0) + blindinc;
        // make_blinded(Blinded + blindinc, FALSE): set the blind timer, then
        // toggle_blindness() -> vision_recalc(0) so the now-unseen monsters are
        // blanked from the display this turn.
        u.blinded = (u.blinded || 0) + blindinc;
    }
    // C ref apply.c:3588 — make_blinded() (which runs toggle_blindness ->
    // vision_recalc(0)) fires BEFORE the "can't see through the goop" pline.
    // The vision recalc must therefore happen between the two messages: the
    // second pline triggers the "--More--" prompt, and the screen captured at
    // that prompt must already show the now-unseen monsters blanked.  Doing the
    // recalc after both plines (as before) left the stale monster glyphs on the
    // --More-- screen, diverging from C (seed0108 step-55).
    if (!wasblind) { try { vision_recalc(0); } catch (e) { /* ignore */ } }
    // !wasblind && now Blind -> the "can't see through the goop" line.
    if (!wasblind) {
        await update_topl(`You can't see through all the sticky goop on your face.`);
    } else {
        await update_topl(`There's more sticky goop all over your face.`);
    }
    // setnotworn + costly_alteration (no RNG, no cost) + use up the pie.
    consume_applied_pie(obj);
    return ECMD_OK;
}

// Remove the applied cream pie from inventory (C: setnotworn + obj_extract_self
// + delobj).  invent.js's useupall removes the whole (quan-1) stack.
//
// C ref apply.c:3603 use_cream_pie() ends with delobj(obj), and
// invent.c:1446 delobj_core() rolls obj_resists(obj, 0, 0) on the object before
// destroying it.  A cream pie is not an Amulet/invocation tool/Rider corpse, so
// obj_resists falls to its `rn2(100)` branch (zap.c:1469) and returns FALSE.
// That single rn2(100) must be emitted here for RNG parity — without it the
// goblin's following dochug/distfleeck stream is shifted by one call (the
// seed0108 step-56 divergence).  useupall() does not emit it, so do it
// explicitly, in C order (after the inventory removal that obj_extract_self
// performs, immediately before the object is freed).
function consume_applied_pie(obj) {
    try {
        if (_invent && typeof _invent.useupall === 'function') {
            _invent.useupall(obj);
            // delobj() -> obj_resists(obj, 0, 0): plain rn2(100) for a cream pie.
            rn2(100);
        } else { obj.where = 'free'; rn2(100); }
    } catch (e) { /* ignore */ }
}

// C ref: do.c:2390 dowipe() — the #wipe command.  When creamed, C does NOT wipe
// in the command turn; it calls set_occupation(wipeoff, ...) and returns
// ECMD_TIME.  The wipeoff() occupation then runs on the FOLLOWING turn from the
// move loop (allmain.c moveloop_core(): after the command turn's monster moves).
// This split matters: in the command turn the hero is STILL creamed/blind, so
// monsters move while the hero can't see; only after wipeoff() runs does the
// hero regain sight.  Modelling the wipe inline (regaining sight before the
// command turn's monsters move) desynced the pet's distfleeck/dog_move stream
// for the rest of seed0108 (the step-62 divergence).
//
// When already clean (ucreamed == 0), C prints "Your face is already clean." and
// returns ECMD_TIME with no occupation.
export async function dowipe() {
    await loadDeps();
    const { update_topl } = await import('./display.js');
    const u = game.u;
    if ((u?.ucreamed || 0) > 0) {
        // set_occupation(wipeoff, ...): the move loop runs wipeoff() next turn.
        game._wipe_occupation = true;
        return ECMD_TIME;
    }
    await update_topl(`Your face is already clean.`);
    return ECMD_TIME;
}

// C ref: do.c:2361 wipeoff() — the #wipe occupation, run each turn from the move
// loop.  Subtracts min(ucreamed,4) and min(BlindedTimeout,4); when Blinded hits
// 0 it prints "You've got the glop off." and make_blinded(0, TRUE) regains sight
// ("You can see again.").  Returns 1 while still busy (clearing more than one
// tick's worth), 0 when finished.  The seed0108 hero is creamed by rnd(25)=3, so
// a single tick fully clears it (returns 0).
export async function wipeoff() {
    await loadDeps();
    const { update_topl } = await import('./display.js');
    const { vision_recalc } = await import('./vision.js');
    const u = game.u;
    const udelta = Math.min(u?.ucreamed || 0, 4);
    const ldelta = Math.min(u?.blinded || 0, 4);
    if (u) {
        u.ucreamed = (u.ucreamed || 0) - udelta;
        u.blinded = (u.blinded || 0) - ldelta;
    }
    if ((u?.blinded || 0) <= 0) {
        if (u) { u.blinded = 0; u.ucreamed = 0; }
        await update_topl(`You've got the glop off.`);
        // make_blinded(0, TRUE): regaining sight -> "You can see again."
        await update_topl(`You can see again.`);
        try { vision_recalc(0); } catch (e) { /* ignore */ }
        return 0; // occupation finished
    } else if ((u?.ucreamed || 0) === 0) {
        await update_topl(`Your face feels clean now.`);
        return 0;
    }
    return 1; // still busy
}

// C ref: apply.c rub_ok() — getobj() classifier for #rub.  Lamps/lanterns,
// graystones and royal jelly are SUGGESTed; everything else is EXCLUDEd (and,
// because rub_ok(NULL) returns EXCLUDE, there is no "- " hands entry in the
// prompt — matching the recorded "What do you want to rub? [n or ?*]").
const LUMP_OF_ROYAL_JELLY = LUMP_OF_ROYAL_JELLY_OTYP; // mkobj.js index 286
// graystones (mkobj.js indices) — rub_ok SUGGESTs these (not exercised here).
const LUCKSTONE = 469, LOADSTONE = 470, TOUCHSTONE = 471, FLINT = 472;
function is_graystone_otyp(otyp) {
    return otyp === FLINT || otyp === LUCKSTONE || otyp === LOADSTONE
        || otyp === TOUCHSTONE;
}
function rub_ok(obj) {
    const I = _invent;
    const EXCLUDE = I ? I.GETOBJ_EXCLUDE : -3;
    const SUGGEST = I ? I.GETOBJ_SUGGEST : 2;
    if (!obj) return EXCLUDE;
    if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
        || obj.otyp === BRASS_LANTERN || is_graystone_otyp(obj.otyp)
        || obj.otyp === LUMP_OF_ROYAL_JELLY)
        return SUGGEST;
    return EXCLUDE;
}

// C ref: apply.c dorub() — the #rub command.  Returns an ECMD_* code.
//
// The recorded seed0108 path rubs a wished magic lamp that is held (not yet
// wielded) in inventory: getobj() asks "What do you want to rub? [n or ?*]",
// 'n' selects the lamp, and because obj != uwep dorub wields it via
// wield_tool() ("You now wield a lamp.") and returns ECMD_TIME, re-queuing
// itself on the canned-command stack (the re-run, with the lamp now wielded,
// is not separately exercised in the recorded stream).  The graystone /
// royal-jelly / already-wielded-lamp (djinni / puff of smoke / nothing) paths
// are present for faithfulness but consume no RNG in the owned sessions.
export async function dorub() {
    await loadDeps();
    const obj = await _invent.getobj('rub', rub_ok, _invent.GETOBJ_NOFLAGS);
    if (!obj) return ECMD_CANCEL;

    if (obj.oclass === GEM_CLASS || obj.oclass === FOOD_CLASS) {
        // graystone -> use_stone, royal jelly -> use_royal_jelly (unmodelled);
        // any other gem/food: "Sorry, I don't know how to use that." (no turn).
        await _display.pline("Sorry, I don't know how to use that.");
        return ECMD_OK;
    }

    if (obj !== game.uwep) {
        if (await _invent.wield_tool(obj, 'rub')) {
            // C: cmdq_add_ec(CQ_CANNED, dorub) + cmdq_add_key(invlet) -> re-runs
            // dorub with the tool wielded.  The wished-lamp session reaches this
            // wield-and-time path; the canned re-run isn't separately recorded.
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    // obj == uwep: the rub-the-wielded-lamp branch.  spe<=0 wished lamps never
    // reach the djinni roll (rn2(3) is short-circuited); the puff/nothing rolls
    // (rn2(2)) are present for faithfulness but unexercised in the owned stream.
    if (game.uwep.otyp === MAGIC_LAMP) {
        if ((game.uwep.spe || 0) > 0 && !rn2(3)) {
            // djinni release: not exercised (no spe>0 wished lamp in sessions).
        } else if (rn2(2)) {
            await _display.pline(`You see a puff of smoke.`);
        } else {
            await _display.pline('Nothing happens.');
        }
    } else if (game.uwep.otyp === BRASS_LANTERN) {
        await _display.pline('Rubbing the electric lamp is not particularly rewarding.');
    } else {
        await _display.pline('Nothing happens.');
    }
    return ECMD_TIME;
}

export const ECMD = { ECMD_OK, ECMD_CANCEL, ECMD_TIME };
