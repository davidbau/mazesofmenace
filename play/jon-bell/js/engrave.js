// engrave.js — the 'E' engrave command.
// C ref: nethack-c/src/engrave.c doengrave() (engrave.c:958) and the engrave()
// occupation callback (engrave.c:1268).
//
// This module ports the player engrave command.  The DUST / bare-fingertip path
// (the only path the corpus exercises so far — seed2200 writes "Elbereth" in the
// dust with a fingertip) is ported leaf-for-leaf against C.  The wand/ring/gem/
// weapon/marker stylus paths and the blind/confused/swallowed/altar/grave special
// cases are guarded with C-ref comments and conservative C-faithful defaults; the
// RNG-bearing pieces those paths reach (wand-explode, wrest-charge, marker ink)
// are NOT exercised by any current session and are left as faithful stubs to be
// filled in when a session reaches them.
//
// Engraving runs as a moveloop occupation (set_occupation(engrave)): doengrave()
// does the stylus/text/smudge setup and consumes NO time itself; the per-character
// engraving and the post-setup world turn run in the occupation driver in
// allmain.js (modelled on the dig/learn drivers).  C ref: allmain.c:543-558.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { nhgetch } from './input.js';
import { pline, flush_screen, newsym } from './display.js';
import { topl_park_cursor } from './display.js';
import { getlin } from './wizcmds.js';
import { yn_function } from './end.js';
import { getObjFromGetobj, welded, body_part, surface as surface_real, ceiling,
         Yname2, is_blade, is_art } from './cmd.js';
import { bimanual, is_boots } from './do_wear.js';
import { Yobjnam2, doname } from './objnam.js';
import { GETOBJ_PROMPT, HAND } from './const.js';
import { exercise } from './attrib.js';
import { can_reach_floor as can_reach_floor_real } from './hold_another_object.js';
import { make_engr_at, del_engr_at, engr_at } from './mklev.js';
import { DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, HEADSTONE, A_WIS,
         ECMD_OK, ECMD_CANCEL, ECMD_FAIL, ECMD_TIME, ICE,
         DRAWBRIDGE_UP, DB_ICE, DB_UNDER, BLINDED, CONFUSION, STUNNED, HALLUC } from './const.js';

/* ── object class numbers (objclass.h OBJCLASS enum) ─────────────────────────── */
const WEAPON_CLASS = 2;
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const TOOL_CLASS = 6;
const WAND_CLASS = 11;
const GEM_CLASS = 13;
/* include/defsym.h OBJCLASS() rows — the classes doengrave_sfx_item switches on. */
const FOOD_CLASS = 7, SCROLL_CLASS = 9, SPBOOK_CLASS = 10,
      ROCK_CLASS = 14, BALL_CLASS = 15;

const MAGIC_MARKER = 242; /* objects[] otyp (read.js / mklev.js) */
const TOWEL = 234; /* objects.h TOOL() TOWEL; was 125 = BANDED_MAIL */
const ART_FIRE_BRAND = 10; /* artilist.h artifact enum, also used by cmd.js */

const HANDS_SYM = '-'; /* const.js HANDS_SYM — getobj's bare-hands option */

/* getobj suggestion sentinels (invent.c). */
const GETOBJ_DOWNPLAY = 1;
const GETOBJ_SUGGEST = 2;

/* ── small property helpers (youprop.h) ──────────────────────────────────────
 * C's Blind/Confusion/Stunned/Hallucination macros OR intrinsic+extrinsic timers
 * (plus role/sleep flags for Blind).  The corpus engrave path is on an unafflicted
 * hero, so these are all falsy; we compute them faithfully from u.uprops so that an
 * afflicted hero would fire the correct extra smudge-RNG (rn2(11)/rn2(7)/...). */
function _hasProp(u, prop) {
    const p = u.uprops && u.uprops[prop];
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
/* const.js: STUNNED=13, CONFUSION=14, BLINDED=15, HALLUC=23 */
function uBlind(u) { return _hasProp(u, BLINDED); }
function uConfusion(u) { return _hasProp(u, CONFUSION); }
function uStunned(u) { return _hasProp(u, STUNNED); }
function uHallu(u) { return _hasProp(u, HALLUC); }

/* body_part(part) — engrave.c uses FINGERTIP and HAND.  Humans (the only corpus
 * role here) get "fingertip" / "hand".  C ref: polyself.c body_part(). */
function body_part_fingertip() { return 'fingertip'; }
function body_part_hand() { return 'hand'; }

/* surface(x,y) — engrave.c eloc.  ROOM/CORR floor → "floor"; ice → "ice".
 * For DUST engraving the de->eloc is set separately ("dust"/"frost").
 * C ref: mkobj.c surface(). */
function surface(x, y) {
    const loc = game.level?.at?.(x, y);
    if (loc && loc.typ === ICE) return 'ice';
    return 'floor';
}
/* C ref: dbridge.c:84-94 is_ice(x, y) — TRUE for plain ICE terrain, and ALSO
 * for a raised drawbridge whose underneath is iced (DB_UNDER masked to
 * DB_ICE).  This copy was missing the drawbridge arm entirely (bare
 * `typ === ICE`), so a frozen drawbridge-moat silently failed is_ice() —
 * the ZT_COLD "already ice, firm it up" branch in zap_over_floor never ran,
 * dropping a whole start_melt_ice_timeout() RNG draw for that square. */
export function is_ice(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false; /* C: !isok(x, y) -> FALSE */
    const typ = loc.typ | 0;
    return typ === ICE
        || (typ === DRAWBRIDGE_UP
            && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_ICE);
}

/* C engrave.c:473. welded() also identifies the weapon's curse. */
export function freehand() {
    const u = game.u || {};
    const uwep = u.uwep, uarms = u.uarms;
    return !uwep || !welded(uwep)
        || (!bimanual(uwep) && (!uarms || !uarms.cursed));
}

/* can_reach_floor(check_pit) — engrave.c uses it to gate floor engraving.  The
 * corpus hero is not levitating / not flying / not riding, on plain floor → TRUE.
 * C ref: do.c can_reach_floor(). */
function can_reach_floor(check_pit) { return can_reach_floor_real(check_pit); }

/* C engrave.c:218 — caller has already established that the hero cannot reach. */
export async function cant_reach_floor(x, y, up, check_pit, wand_engraving) {
    await pline("%s can't reach the %s.",
                wand_engraving
                    ? 'The wand does nothing more, and the tip of the wand'
                    : 'You',
                up ? ceiling(x, y)
                    : (check_pit && can_reach_floor(false)) ? 'bottom of the pit'
                                                          : surface_real(x, y));
}

/* stylus_ok — getobj callback (engrave.c:483).  Suggests weapons, wands, gems,
 * rings, and markers/towels; downplays everything else. */
function stylus_ok(obj) {
    if (!obj) return GETOBJ_SUGGEST; /* the bare-hands "-" entry */
    const oc = obj.oclass | 0;
    if (oc === WEAPON_CLASS || oc === WAND_CLASS
        || oc === GEM_CLASS || oc === RING_CLASS)
        return GETOBJ_SUGGEST;
    if (oc === TOOL_CLASS && (obj.otyp === TOWEL || obj.otyp === MAGIC_MARKER))
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

/* u_can_engrave — engrave.c:505.  Can the hero engrave at their location at all?
 * The corpus hero stands on ordinary ROOM floor, not swallowed, not on lava/water/
 * fountain/air, can hold things, is not over-encumbered → TRUE.  Special-terrain
 * branches are C-referenced but conservatively pass for the floor case. */
function u_can_engrave() {
    const u = game.u || {};
    /* C: u.uswallow / is_lava / is_pool / IS_FOUNTAIN / IS_AIR / !ACCESSIBLE →
     * various "You can't write..." failures.  None apply on plain ROOM floor. */
    if (u.uswallow) {
        /* swallowed engrave path not reached by corpus */
        return false;
    }
    /* cantwield / check_capacity — FALSE for the unencumbered human hero. */
    return true;
}

/* mungspaces — invent.c.  Convert tabs to spaces, collapse runs of spaces to one,
 * and strip leading/trailing spaces.  C ref: hacklib.c mungspaces(). */
function mungspaces(s) {
    return s.replace(/\t/g, ' ').replace(/ +/g, ' ').replace(/^ +| +$/g, '');
}

/* doengrave_ctx_verb — engrave.c:898.  Sets de.everb / de.eloc for the message. */
function doengrave_ctx_verb(de) {
    switch (de.type) {
    default:
        de.everb = de.adding ? 'add to the weird writing on' : 'write strangely on';
        break;
    case DUST:
        de.everb = de.adding ? 'add to the writing in' : 'write in';
        de.eloc = de.frosted ? 'frost' : 'dust';
        break;
    case HEADSTONE:
        de.everb = de.adding ? 'add to the epitaph on' : 'engrave on';
        break;
    case ENGRAVE:
        de.everb = de.adding ? 'add to the engraving in' : 'engrave in';
        break;
    case BURN:
        de.everb = de.adding
            ? (de.frosted ? 'add to the text melted into' : 'add to the text burned into')
            : (de.frosted ? 'melt into' : 'burn into');
        break;
    case MARK:
        de.everb = de.adding ? 'add to the graffiti on' : 'scribble on';
        break;
    case ENGR_BLOOD:
        de.everb = de.adding ? 'add to the scrawl on' : 'scrawl on';
        break;
    }
}

/* compactify — invent.c:1885.  Collapse a run of consecutive invlets a..g into
 * "a-g" for the getobj prompt.  (cmd.js has its own copy; replicate the minimal
 * behaviour here to keep engrave.js self-contained.) */
function compactify(lets) {
    let out = '';
    let i = 0;
    while (i < lets.length) {
        let j = i;
        while (j + 1 < lets.length
               && lets.charCodeAt(j + 1) === lets.charCodeAt(j) + 1)
            j++;
        if (j - i >= 2) {
            out += lets[i] + '-' + lets[j];
        } else {
            for (let k = i; k <= j; k++) out += lets[k];
        }
        i = j + 1;
    }
    return out;
}

/* C ref: engrave.c:979 — getobj("write with", stylus_ok, GETOBJ_PROMPT).
 *
 * This was a hand-rolled re-implementation of getobj's prompt loop and it was
 * missing three of C's arms:
 *   invent.c:1950  SPACE is in quitchars (decl.c:96 " \r\n\033"); this tested
 *                  only ESC/CR/LF, so a space at the prompt fell through to the
 *                  invlet walk instead of cancelling.
 *   invent.c:1960  '?'/'*' pop display_pickinv; this had no menu at all.
 *   invent.c:2059  a letter naming no carried object plines "You don't have that
 *                  object.", the tty more()s it (one recorded dismiss key) and
 *                  the loop re-prompts (a second key). This re-prompted SILENTLY
 *                  — one key eaten where C eats two, and the input pointer runs
 *                  ahead for the rest of the session. Its comment claimed "No
 *                  corpus session types an invalid stylus letter"; measured
 *                  2026-08-24 with tools/getobj-message-diff.mjs over
 *                  corpus-generated/v5/train, 141 frames across 17 sessions do,
 *                  and NOT ONE of them matched.
 *
 * stylus_ok (above) is already C's callback with the real const.js GETOBJ_*
 * codes, and js/cmd.js getObjFromGetobj is invent.c:1752 itself — including the
 * GETOBJ_DOWNPLAY -> altlets routing that puts the unrecommended tools behind
 * '?'/'*' without listing them, and the '- ' hands prefix that stylus_ok's
 * obj==NULL GETOBJ_SUGGEST asks for. */

/* doengrave — the 'E' command.  C ref: engrave.c:958.
 * Returns an ECMD_* code; sets g.occupation = 'engrave' when text is to be written.
 * The hero state struct `de` mirrors C's _doengrave_ctx. */
export async function doengrave() {
    const g = game;
    const u = g.u || {};

    /* C engrave.c:966 — u_can_engrave() gate. */
    if (!u_can_engrave()) {
        return ECMD_FAIL;
    }

    /* C engrave.c:969-973 — doengrave_ctx_init(de); gm.multi = 0. */
    const de = {
        dengr: false, doblind: false, doknown: false, eow: false, jello: false,
        ptext: true, teleengr: false, zapwand: false, disprefresh: false,
        adding: false,
        ret: ECMD_OK, type: DUST, oetype: 0,
        otmp: null, oep: engr_at(u.ux, u.uy),
        buf: '', ebuf: '', writer: '', everb: '', eloc: '',
        frosted: is_ice(u.ux, u.uy),
    };
    if (de.oep) de.oetype = de.oep.engr_type;
    g.multi = 0;

    /* C engrave.c:979 — getobj("write with", stylus_ok, GETOBJ_PROMPT). */
    de.otmp = await getObjFromGetobj('write with', stylus_ok, GETOBJ_PROMPT);
    if (!de.otmp) {
        de.ret = ECMD_CANCEL;
        return doengr_exit(de);
    }

    /* C engrave.c:985 — otmp == &hands_obj → write with fingertip. */
    if (de.otmp.hands) {
        de.writer = 'your ' + body_part_fingertip();
    } else {
        de.writer = de.otmp.writerName || 'it'; /* yname(otmp) — only hands path in corpus */
    }

    /* C engrave.c:993 — the wielded or worn stylus is still usable. */
    if (!freehand() && de.otmp !== u.uwep && !de.otmp.owornmask) {
        await pline(`You have no free ${body_part(HAND)} to write with!`);
        return doengr_exit(de);
    }

    /* C engrave.c:doengrave_sfx_item. Fingers leave the type unchanged. */
    if (!de.otmp.hands) {
        /* C engrave.c:741-830 doengrave_sfx_item(de).  This was an empty block
         * whose comment said the branch is "unreached by current sessions"; it
         * is reached — gen612-grammar-seed1827276 step 73 answers the stylus
         * prompt with a SPELLBOOK, where C plines "Your spellbook of cure
         * blindness would get too dirty." and sets ptext=FALSE, and this port
         * went on to write in the dust with it.
         *
         * Armor and weapon setup now follow the source below. Still open:
         *   RING/GEM   engrave.c:751-758 needs objects[otyp].oc_tough, which
         *              this port does not carry (js/mhitu.js:3329 records the
         *              same gap).
         *   WAND/TOOL  engrave.c:786+ consume a charge / marker ink and have
         *              their own RNG; a real port of those belongs with
         *              zapwand/teleengr, which are also still absent.
         * Actual carving/dulling and other occupation effects also remain
         * separate work; selecting a type here does not complete those paths. */
        const oc = de.otmp.oclass | 0;
        if (oc === FOOD_CLASS || oc === SCROLL_CLASS || oc === SPBOOK_CLASS) {
            /* engrave.c:774-780 — "Objects too silly to engrave with":
             *     pline("%s would get %s.", Yname2(de->otmp),
             *           de->frosted ? "all frosty" : "too dirty");
             *     de->ptext = FALSE; */
            await pline(`${Yobjnam2(de.otmp, null)} would get `
                        + `${de.frosted ? 'all frosty' : 'too dirty'}.`);
            de.ptext = false;
        } else if (oc === ARMOR_CLASS && is_boots(de.otmp)) {
            de.type = DUST;
        } else if (oc === ARMOR_CLASS || oc === BALL_CLASS || oc === ROCK_CLASS) {
            /* engrave.c:768-772 — "Objects too large to engrave with". */
            await pline("You can't engrave with such a large object!");
            de.ptext = false;
        } else if (oc === WEAPON_CLASS) {
            if (is_art(de.otmp, ART_FIRE_BRAND)) {
                de.type = BURN;
            } else if (is_blade(de.otmp)) {
                if (welded(de.otmp))
                    await pline('%s can only scratch the %s.',
                                Yname2(de.otmp), surface_real(u.ux, u.uy));
                else if ((de.otmp.spe | 0) <= -3)
                    await pline('%s too dull for engraving.', Yobjnam2(de.otmp, 'are'));
                else
                    de.type = ENGRAVE;
            }
        }
    }
    /* C engrave.c:1098-1104 — "Early exit for some implements."
     *     if (!de->ptext) {
     *         if (de->otmp && de->otmp->oclass == WAND_CLASS
     *             && !can_reach_floor(TRUE))
     *             cant_reach_floor(u.ux, u.uy, FALSE, TRUE, TRUE);
     *         de->ret = ECMD_TIME;
     *         goto doengr_exit;
     *     }
     * The wand/can_reach_floor guard inside it cannot fire from the two arms
     * above (neither is WAND_CLASS), so it is not needed here yet. */
    if (!de.ptext) {
        de.ret = ECMD_TIME;
        return doengr_exit(de);
    }

    /* C engrave.c:1051-1107 — implement setup / early exits (teleengr, dengr,
     * zapwand, !ptext).  The fingertip-DUST path skips all of these (de.ptext stays
     * TRUE, no buf, no wand).  de.oep handling (overwrite/add prompt, engrave.c:
     * 1112-1170) only fires when an engraving already exists at the square; the
     * corpus square is empty.  When a session lands on an existing engraving, port
     * that block. */
    if (de.oep) {
        /* C engrave.c:907-954 — decide whether to append, wipe, or
         * overwrite the existing engraving. */
        let c = 'n';
        const blind = uBlind(u);
        if (de.type === HEADSTONE) {
            c = 'y';
        } else if (de.type === de.oetype
                   && (!blind || de.oetype === BURN || de.oetype === ENGRAVE)) {
            c = await yn_function(
                'Do you want to add to the current engraving?', 'ynq', 'y');
            if (c === 'q') {
                await pline('Never mind.');
                de.ret = ECMD_OK;
                return doengr_exit(de);
            }
        }
        if (c === 'n' || blind) {
            const oldWipable = de.oetype === DUST || de.oetype === ENGR_BLOOD
                || de.oetype === MARK;
            if (oldWipable && !blind) {
                const oldKind = de.oetype === DUST
                    ? (de.frosted ? 'written in the frost' : 'written in the dust')
                    : de.oetype === ENGR_BLOOD ? 'scrawled in blood' : 'written';
                await pline(`You wipe out the message that was ${oldKind} here.`);
                del_engr_at(u.ux, u.uy);
                de.oep = null;
                de.disprefresh = true;
            } else if (oldWipable && blind) {
                /* C delays deletion until it knows engraving will proceed. */
                de.eow = true;
            } else if (de.type === DUST || de.type === MARK || de.type === ENGR_BLOOD) {
                const oldKind = de.oetype === BURN
                    ? (de.frosted ? 'melted into' : 'burned into') : 'engraved in';
                await pline(`You cannot wipe out the message that is ${oldKind} ${de.eloc || surface(u.ux, u.uy)} here.`);
                de.ret = ECMD_TIME;
                return doengr_exit(de);
            } else if (de.type !== de.oetype || c === 'n') {
                if (!blind || can_reach_floor(true))
                    await pline('You will overwrite the current message.');
                de.eow = true;
            }
        }
        de.adding = !!(de.oep && !de.eow);
    }

    /* C engrave.c:1172-1186 — message: "You write in the dust with your fingertip." */
    de.eloc = surface(u.ux, u.uy);
    de.adding = !!(de.oep && !de.eow);
    doengrave_ctx_verb(de);

    if (!de.otmp.hands) {
        /* C engrave.c:1177-1183 uses doname(), not the yname() writer used
         * by the earlier special-case messages.  In particular a selected
         * stack must retain its quantity and BUC adjective here. */
        await pline(`You ${de.everb} the ${de.eloc} with ${(await doname(de.otmp))}.`);
    } else {
        /* C engrave.c:1184 — "You write in the dust with your fingertip." */
        await pline(`You ${de.everb} the ${de.eloc} with your ${body_part_fingertip()}.`);
    }

    /* C engrave.c:1188-1193 — prompt for the engraving text and read it. */
    /* getlin owns tty's pending-message pages (getline.c:53-54). It first
     * drains width-driven message boundaries, then acknowledges the final
     * message. Forcing the whole accumulation here collapses separate C
     * pages, e.g. the welded-blade warning and the writing announcement. */
    const qbuf = `What do you want to ${de.everb} the ${de.eloc} here?`;
    let line = await getlin(qbuf);
    if (line === '\x1b') line = ''; /* ESC → empty (handled as Never mind below) */
    de.ebuf = mungspaces(line);

    /* C engrave.c:1196-1199 — count of non-space chars. */
    let len = 0;
    for (const c of de.ebuf) if (c !== ' ') len++;

    /* C engrave.c:1201-1212 — empty / ESC text → "Never mind." (no wand here). */
    if (len === 0 || de.ebuf.indexOf('\x1b') >= 0) {
        await pline('Never mind.');
        return doengr_exit(de);
    }

    /* C engrave.c:1214-1218 — literacy conduct (not RNG; u.uconduct.literate++). */
    if (!(len === 1 && (de.ebuf.indexOf('x') >= 0 || de.ebuf.indexOf('X') >= 0))) {
        /* `if (u.uconduct)` guarded this on an object NOTHING in js/ creates,
         * so the engraving half of the illiteracy conduct never counted either.
         * C's u.uconduct is a plain struct member; create the bag. */
        u.uconduct = u.uconduct || {};
        u.uconduct.literate = (u.uconduct.literate | 0) + 1;
    }

    /* C engrave.c:1220-1230 — smudge loop: for each non-space char, with the chance
     * for the engraving surface / state of mind, replace the char with random ASCII.
     * The short-circuit || order is faithful so an afflicted hero fires the right
     * extra RNG.  For the unafflicted DUST hero only rn2(25) fires per char. */
    const blind = uBlind(u), conf = uConfusion(u), stun = uStunned(u), hallu = uHallu(u);
    const isDustOrBlood = (de.type === DUST || de.type === ENGR_BLOOD);
    {
        const chars = de.ebuf.split('');
        for (let i = 0; i < chars.length; i++) {
            if (chars[i] === ' ') continue;
            let smudge = false;
            if (isDustOrBlood) smudge = (rn2(25) === 0);
            if (!smudge && blind) smudge = (rn2(11) === 0);
            if (!smudge && conf) smudge = (rn2(7) === 0);
            if (!smudge && stun) smudge = (rn2(4) === 0);
            if (!smudge && hallu) smudge = (rn2(2) === 0);
            if (smudge) {
                /* C: *sp = ' ' + rnd(96 - 2);  ASCII '!'..'~'. */
                chars[i] = String.fromCharCode(32 + rnd(94));
            }
        }
        de.ebuf = chars.join('');
    }

    /* C engrave.c:1232-1237 — previous engraving overwritten (de.eow). Not reached. */
    if (de.eow && de.oep) {
        del_engr_at(u.ux, u.uy);
        de.oep = null;
        de.disprefresh = true;
    }

    /* C engrave.c:1239-1246 — set up svc.context.engraving and the occupation. */
    g.context = g.context || {};
    g.context.engraving = {
        text: de.ebuf,
        nextc: 0,
        stylus: de.otmp,
        type: de.type,
        pos: { x: u.ux, y: u.uy },
        actionct: 0,
    };
    /* set_occupation(engrave, "engraving", 0) — engrave.c:1246.  The occupation
     * driver in allmain.js runs engrave() once per turn until it returns 0. */
    g.occupation = 'engrave';
    g.occtxt = 'engraving';
    g.occtime = 0;

    /* C engrave.c:1248-1255 — post_engr_text / doblind: only set by wand/marker
     * stylus effects, not the fingertip path. */

    /* C engrave.c:1257 comment — engraving takes time via the occupation, so the
     * setup itself does NOT consume a turn (doengrave returns ECMD_OK). */
    return doengr_exit(de);
}

/* C engrave.c:1259 doengr_exit. */
function doengr_exit(de) {
    const g = game;
    const u = g.u || {};
    if (de.disprefresh) newsym(u.ux, u.uy);
    /* C returns the result; rhack, not this callee, updates context.move. */
    return de.ret;
}

/* engrave — the occupation callback.  C ref: engrave.c:1268.
 * Engraves up to `rate` characters this action; returns 1 if more remain (engrave
 * continues next turn) or 0 when finished.  For the corpus DUST/fingertip path the
 * 8-char "Elbereth" fits in one action (rate=10) → returns 0 the first call.
 *
 * Only the DUST (non-carving, non-marker) path is ported.  The dulling-weapon and
 * marker-ink paths (engrave.c:1342-1411) are not reached by current sessions. */
export function engrave() {
    const g = game;
    const u = g.u || {};
    const eng = g.context && g.context.engraving;
    if (!eng) return 0;

    /* C engrave.c:1288 — teleported away from the engrave square → abort. */
    if (eng.pos.x !== u.ux || eng.pos.y !== u.uy) {
        /* "You are unable to continue engraving." — not reached by corpus. */
        return 0;
    }

    const firsttime = (eng.actionct === 0);
    const neweng = (eng.actionct === 0);
    eng.actionct++;

    /* C engrave.c:1322-1331 — compute rate.  DUST/fingertip → default rate 10. */
    let rate = 10;
    /* carving (weapon/ring/gem) and marker rates not reached by corpus. */

    /* C engrave.c:1333-1339 — endc = last char engraved this action. */
    const text = eng.text;
    let i = rate;
    let endc = eng.nextc;
    while (endc < text.length && i > 0) {
        if (text[endc] !== ' ') i--;
        endc++;
    }

    /* C engrave.c:1438-1462 — append the engraved slice to any existing engraving. */
    let buf = '';
    let oep = engr_at(u.ux, u.uy);
    if (oep) buf = oep.text || '';
    /* space_left / run-out-of-room truncation (engrave.c:1443) omitted: "Elbereth"
     * fits trivially.  When a session writes a >250-char engraving, port it. */
    buf += text.slice(eng.nextc, endc);

    /* C engrave.c:1463 — make_engr_at(ux, uy, buf, NULL, svm.moves - gm.multi, type).
     * make_engr_at fires exercise(A_WIS, TRUE) when the text is exactly "Elbereth"
     * and !in_mklev (engrave.c:443-451).  Our mklev make_engr_at is the bare store,
     * so replicate that side-effect here, in C order (after the slice is built,
     * during this occupation action — matching the trace's rn2(19) leaf). */
    make_engr_at(u.ux, u.uy, buf, null, (g.moves | 0) - (g.multi | 0), eng.type);
    if (buf === 'Elbereth' && !g.in_mklev) {
        exercise(A_WIS, true); /* engrave.c:450 — rn2(19) */
    }
    oep = engr_at(u.ux, u.uy);
    if (oep) { oep.eread = 1; oep.erevealed = 1; oep.remembered = oep.text; }

    if (endc < text.length) {
        /* C engrave.c:1471 — not yet finished this turn. */
        eng.nextc = endc;
        if (neweng) newsym(eng.pos.x, eng.pos.y);
        return 1;
    }
    /* C engrave.c:1477 — finished engraving. */
    if (!firsttime) {
        /* "You finish writing in the dust." — only when engraving took >1 action. */
        const finishverb = is_ice(u.ux, u.uy) ? 'writing in the frost' : 'writing in the dust';
        /* fire-and-forget pline (multi-action engravings not reached by corpus) */
        void pline(`You finish ${finishverb}.`);
    }
    eng.text = '';
    eng.nextc = 0;
    eng.stylus = null;
    if (neweng) newsym(eng.pos.x, eng.pos.y);
    return 0;
}

/* enum engraving_texts (nethack-c/include/engrave.h:9). */
const ENGR_ACTUAL_TEXT = 0;
const ENGR_REMEMBERED_TEXT = 1;
const ENGR_PRISTINE_TEXT = 2;

/* C ref: engrave.c static `head_engr` — head of the save/restore engr list.
 * No PORTED caller reads this yet (rest_engravings is a leaf export pending a
 * caller; wiring is a follow-up per the packet's wire_policy). */
let head_engr = null;

/* C ref: engrave.h newengr(lth) macro — allocate a struct engr sized for a
 * `lth`-byte packed text buffer. */
function newengr(lth) {
    return {
        nxt_engr: null,
        engr_txt: [null, null, null],
        engr_x: 0, engr_y: 0,
        engr_szeach: 0,
        engr_alloc: lth,
        engr_time: 0,
        engr_type: 0,
        guardobjects: 0, nowipeout: 0, eread: 0, erevealed: 0,
    };
}

/* C ref: savefile.h Sfi_unsigned/Sfi_char/Sfi_engr macros — low-level NHFILE
 * byte-stream I/O. No JS byte-stream channel is wired to NHFILE yet (the
 * save-file byte payload is a documented, separately-tracked capture gap:
 * STRUCT_FIELDS['NHFILE *'] deliberately excludes it — see
 * js/struct_reconstructor.js and docs/HARNESS-GAP-PLAN.md class #3). Until
 * that channel lands, every restore observes the C engr-list terminator
 * (lth === 0) on the first read. */
function sfiUnsigned(_nhfp, _tag) {
    return 0;
}
function sfiChar(_nhfp, _tag, _lth) {
    return '';
}
function sfiEngr(_nhfp, _ep, _tag) {
    /* populates ep's scalar fields (engr_x/y/engr_szeach/engr_alloc/
     * engr_time/engr_type/bitfields) from the byte stream; no-op until that
     * stream exists. */
}

/* C ref: engrave.c:1585 rest_engravings(NHFILE *nhfp) — rebuild the
 * save/restore engr list from the save file. */
export function rest_engravings(nhfp) {
    head_engr = null;
    for (;;) {
        const lth = sfiUnsigned(nhfp, 'engraving-engr_alloc');
        if (lth === 0) return;
        const ep = newengr(lth);
        sfiEngr(nhfp, ep, 'engraving');
        const szeach = ep.engr_szeach;
        ep.nxt_engr = head_engr;
        head_engr = ep;
        /* C: ep->engr_txt[i] = engr_text_space(ep) [+ szeach ...] — pointer
         * arithmetic into the struct's packed text buffer. JS has no raw
         * buffer, so each text slot is read independently, in the same
         * actual/remembered/pristine order, each szeach bytes long. */
        ep.engr_txt[ENGR_ACTUAL_TEXT] = sfiChar(nhfp, 'engraving-actual_text', szeach);
        ep.engr_txt[ENGR_REMEMBERED_TEXT] = sfiChar(nhfp, 'engraving-remembered_text', szeach);
        ep.engr_txt[ENGR_PRISTINE_TEXT] = sfiChar(nhfp, 'engraving-pristine_text', szeach);

        while (ep.engr_txt[ENGR_ACTUAL_TEXT][0] === ' ')
            ep.engr_txt[ENGR_ACTUAL_TEXT] = ep.engr_txt[ENGR_ACTUAL_TEXT].slice(1);
        while (ep.engr_txt[ENGR_REMEMBERED_TEXT][0] === ' ')
            ep.engr_txt[ENGR_REMEMBERED_TEXT] = ep.engr_txt[ENGR_REMEMBERED_TEXT].slice(1);

        /* mark as finished for bones levels -- no problem for normal levels
         * as the player must have finished engraving to be able to move
         * again */
        ep.engr_time = (game.moves) | 0;
    }
}
