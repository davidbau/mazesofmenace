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
import { CQ_CANNED } from './const.js';
import { rn2, rnd, rn1 } from './rng.js';

import {
    TOOL_CLASS, WAND_CLASS, SPBOOK_CLASS, POTION_CLASS, WEAPON_CLASS,
    COIN_CLASS, SCROLL_CLASS, MAGIC_MARKER, SCR_BLANK_PAPER, SPE_BLANK_PAPER,
    SPE_BOOK_OF_THE_DEAD, POT_OIL, objects,
} from './mkobj.js';
import { DESCR_BY_OTYP } from './o_descr_data.js';
import {
    SDOOR, SCORR, DOOR, CORR, D_LOCKED, D_CLOSED,
    IS_AIR, IS_ROOM, IS_WALL, IS_DOOR,
} from './const.js';
import { surface as surface_word } from './dungeon.js';

// C ref: include/onames.h — STETHOSCOPE object type index (mkobj.js OBJECTS
// row [237, "STETHOSCOPE", ...]).  Defined locally to avoid threading a new
// export through mkobj.js.
const STETHOSCOPE = 237;
const SPE_NOVEL = 406; // mkobj.js OBJECT_DATA — novel (a spellbook subtype)

// C ref: include/onames.h — lamp/lantern object types rubbed by dorub().
const BRASS_LANTERN = 226, OIL_LAMP = 227, MAGIC_LAMP = 228;
// Graystones and royal jelly route to use_stone/use_royal_jelly (not exercised).
const GEM_CLASS = 9, FOOD_CLASS = 7;
// Applicable foods (mkobj.js OBJECT_DATA indices).
const EUCALYPTUS_LEAF = 276, LUMP_OF_ROYAL_JELLY_OTYP = 286, CREAM_PIE = 287;
const BANANA = 281;       // apply_ok DOWNPLAYs a banana while hallucinating
const BULLWHIP_OTYP = 82; // mkobj.js OBJECT_DATA otyp column
const STATUE_OTYP = 476;  // mkobj.js STATUE
// skills.h P_SKILL levels used by calc_pole_range().
const P_SKILLED = 3, P_EXPERT = 4;

// C ref: include/onames.h — the lock-picking tools (mkobj.js OBJECTS rows).
const SKELETON_KEY = 221, LOCK_PICK = 222, CREDIT_CARD = 223;
// C ref: include/onames.h SACK/OILSKIN_SACK/BAG_OF_HOLDING (mkobj.js rows).
const SACK_OTYP = 217, OILSKIN_SACK_OTYP = 218, BAG_OF_HOLDING_OTYP = 219;

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
let _vision = null;
let _enhance = null;
async function loadDeps() {
    if (!_invent) _invent = await import('./invent.js');
    if (!_display) _display = await import('./display.js');
    if (!_cmd) _cmd = await import('./cmd.js');
    if (!_uhitm) _uhitm = await import('./uhitm.js');
    if (!_vision) _vision = await import('./vision.js');
    if (!_enhance) _enhance = await import('./enhance.js');
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

    // C ref: apply.c apply_ok() — is_pick/is_axe/is_pole/BULLWHIP all SUGGEST.
    // A Knight's starting lance is the common case; the blanket
    // EXCLUDE_SELECTABLE left it off the apply prompt's suggested-letter list.
    if (obj.oclass === WEAPON_CLASS) {
        if (I && (I.is_pick(obj) || I.is_axe(obj) || I.is_pole(obj)))
            return SUGGEST;
        if (obj.otyp === BULLWHIP_OTYP) return SUGGEST;
        return EXCLUDE_SELECTABLE;
    }

    if (obj.oclass === POTION_CLASS) {
        // C ref: apply.c apply_ok() — only an UNIDENTIFIED potion downplays; an
        // identified one is SUGGESTed when it is oil and otherwise falls
        // through to EXCLUDE_SELECTABLE below.  Returning DOWNPLAY for every
        // potion set getobj()'s forceprompt, so 'a' with nothing applicable
        // raised the prompt instead of printing "You don't have anything to
        // use or apply." (holy water is type-known from turn 1).
        // C's oc_name_known: an object with no randomized appearance is
        // type-known from init_objects (see invent.js not_fully_identified).
        const typeKnown = !!objects[obj.otyp]?.oc_name_known
            || DESCR_BY_OTYP[obj.otyp] == null;
        if (!obj.dknown || !typeKnown) return DOWNPLAY;
        if (obj.otyp === POT_OIL) return SUGGEST;
    }

    // C ref apply.c:4185 — certain foods are applicable (cream pie -> facial,
    // eucalyptus leaf -> cure, royal jelly -> eat).  These are SUGGESTed so the
    // apply prompt lists their invlet (e.g. the wished cream pie 'o').
    if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF
        || obj.otyp === LUMP_OF_ROYAL_JELLY_OTYP)
        return SUGGEST;

    // C ref: apply.c:4190 — a hallucinating hero can "phone" a banana.
    if (obj.otyp === BANANA && !!game.u?.uhallu) return DOWNPLAY;

    // C ref: apply.c:4193 — a gray stone is SUGGESTed unless the hero KNOWS it
    // isn't a touchstone.  Omitting the whole branch dropped every carried
    // luckstone/loadstone/flint/touchstone out of the apply prompt's
    // suggested-letter list, which is printed verbatim on the topline.
    if (is_graystone_otyp(obj.otyp)) {
        if (!obj.dknown) return SUGGEST;
        if (obj.otyp !== TOUCHSTONE
            && (objects[TOUCHSTONE]?.oc_name_known
                || objects[obj.otyp]?.oc_name_known))
            return EXCLUDE_SELECTABLE;
        return SUGGEST;
    }

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

// ── music.c ────────────────────────────────────────────────────────────────
const LEATHER_DRUM_OTYP = 257;
// C ref: apply.c:4373-4384 — the ten otyps that reach do_play_instrument().
// HORN_OF_PLENTY (252) is deliberately NOT one of them.
const INSTRUMENT_OTYPS = new Set([247 /*WOODEN_FLUTE*/, 248 /*MAGIC_FLUTE*/,
    249 /*TOOLED_HORN*/, 250 /*FROST_HORN*/, 251 /*FIRE_HORN*/,
    253 /*WOODEN_HARP*/, 254 /*MAGIC_HARP*/, 256 /*BUGLE*/,
    257 /*LEATHER_DRUM*/, 258 /*DRUM_OF_EARTHQUAKE*/]);

// C ref: prop.h Deaf — the hero can't hear.  Never set for these heroes but
// the stethoscope's first guard reads it.
function Deaf() {
    const u = game.u;
    return ((u?.uprops?.Deaf || 0) > 0) || ((u?.uprops?.HDeaf || 0) > 0);
}

// C ref: wield.c will_weld(optr) — `optr->cursed && (erodeable_wep(optr) ||
// otyp == TIN_OPENER)`, where erodeable_wep is WEAPON_CLASS || is_weptool ||
// HEAVY_IRON_BALL || IRON_CHAIN.  js/invent.js keeps a private welded() that is
// stubbed to `return false`, so the real predicate lives here.
// mkobj.js OBJECT_DATA indices (verified against the loaded table, not guessed).
const HEAVY_IRON_BALL = 477, IRON_CHAIN = 478, TIN_OPENER = 239;
function welded_uwep() {
    const o = game.uwep;
    if (!o || !o.cursed) return false;
    return o.oclass === WEAPON_CLASS
        || !!(_invent && _invent.is_weptool && _invent.is_weptool(o))
        || o.otyp === HEAVY_IRON_BALL || o.otyp === IRON_CHAIN
        || o.otyp === TIN_OPENER;
}
function freehand() {
    if (!welded_uwep()) return true;
    return !_invent.bimanual(game.uwep) && !(game.uarms && game.uarms.cursed);
}

// C ref: apply.c use_stethoscope() — read a direction, then report on the
// hero (self), an adjacent monster (mstatusline, with the mimic/hidden reveal),
// or the empty square ("You hear nothing special.").
async function use_stethoscope(obj) {
    // C ref: apply.c:326 — three guards BEFORE getdir(), each returning ECMD_OK
    // WITHOUT reading a direction key.  Getting that wrong is a keystroke-count
    // bug, not a message bug: the direction key would be handed to the command
    // parser instead.  (nohands() needs polymorph, which is unported.)
    if (Deaf()) {
        await _display.pline("You can't hear anything!");
        return ECMD_OK;
    }
    if (!freehand()) {
        await _display.pline('You have no free hand.');
        return ECMD_OK;
    }
    // getdir(): read a direction.  '.'/'s' => self (dx=dy=dz=0).
    const dir = await _cmd.getdir();
    if (!dir) return ECMD_CANCEL; // ESC

    // res: first use of this turn is free (ECMD_OK), a repeat costs the turn.
    game.context = game.context || {};
    const seq = hero_seq();
    const res = { v: (seq === game.context.stethoscope_seq) ? ECMD_TIME : ECMD_OK };
    game.context.stethoscope_seq = seq;

    const { update_topl } = await import('./display.js');
    const { m_at, newsym, map_invisible } = await import('./display.js');
    const u = game.u;

    // C ref: apply.c:361 — the up/down arm.  Aiming '>' at the floor probes
    // whatever corpse or statue lies there; '<' only reports that the hero
    // can't reach the ceiling.  The old port ignored dz entirely, so `a<tool><`
    // fell through to the adjacent-square scan (rx,ry == the hero's own square)
    // and printed "You hear nothing special.".
    if (dir.dz) {
        if (dir.dz < 0) {
            await update_topl(`You can't reach the ${ceiling_word(u.ux, u.uy)}.`);
        } else if (!await its_dead(u.ux, u.uy, res)) {
            await update_topl(`The ${surface_word(u.ux, u.uy)} seems healthy enough.`);
        }
        return res.v;
    }

    // C ref: apply.c:381 — a CURSED stethoscope has a 1-in-2 chance of
    // reporting the hero's own heartbeat instead, and that rn2(2) is drawn on
    // every use of a cursed one.  It was missing entirely.
    if (obj?.cursed && !rn2(2)) {
        await update_topl('You hear your heart beat.');
        return res.v;
    }

    // C ref: apply.c:386 confdir(FALSE) — a confused or stunned hero probes a
    // RANDOM direction, and that rn2 is drawn before the square is chosen.
    const d = confdir_apply(dir);

    // Self (dx==dy==0): ustatusline().
    if (!d.dx && !d.dy) {
        await ustatusline();
        return res.v;
    }

    const rx = u.ux + d.dx, ry = u.uy + d.dy;

    // C ref: apply.c:407 — isok() bounds check.  Off-map -> "faint typing noise".
    if (rx < 0 || rx > 79 || ry < 0 || ry > 21) {
        await update_topl('You hear a faint typing noise.');
        return ECMD_OK;
    }

    const mtmp = m_at(rx, ry);
    if (mtmp) {
        const mnm = x_monnam(mtmp, /*ARTICLE_A*/ 2, null, 0, false);
        const spotted = _uhitm.canspotmon(mtmp);
        if (mtmp.mundetected) {
            // C ref: apply.c:418 — the "hidden there" line is gated on
            // !canspotmon; the mundetected clear + newsym are not.
            if (!spotted) await update_topl(`There is ${mnm} hidden there.`);
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
        } else if (!spotted) {
            // C ref: apply.c:461 — `flags.verbose && !canspotmon(mtmp)`.
            // verbose is on by default.
            await update_topl(`There is ${mnm} there.`);
        }
        await mstatusline(mtmp, update_topl);
        // C ref: apply.c:466 — an unspottable monster leaves an 'I' mark.
        if (!spotted) { try { map_invisible(rx, ry); } catch (_e) { /* ignore */ } }
        return res.v;
    }

    // C ref: apply.c:470 — an 'I' mark with nothing under it is cleared.
    if (unmap_invisible_at(rx, ry))
        await update_topl('The invisible monster must have moved.');

    // C ref: apply.c:474 — the stethoscope FINDS secret doors and passages.
    // "a hollow sound.  This must be a secret door!", and the square really
    // becomes a DOOR/CORR: skipping this left a permanently hidden door on a
    // map C had already revealed.
    const lev = game.level?.at(rx, ry);
    if (lev && lev.typ === SDOOR) {
        await update_topl('You hear a hollow sound.  This must be a secret door!');
        cvt_sdoor_to_door(lev);
        _vision.recalc_block_point(rx, ry);
        newsym(rx, ry);
        return res.v;
    }
    if (lev && lev.typ === SCORR) {
        await update_topl('You hear a hollow sound.  This must be a secret passage!');
        lev.typ = CORR; lev.flags = 0;
        _vision.unblock_point(rx, ry);
        newsym(rx, ry);
        return res.v;
    }

    // C ref: apply.c:483 — a corpse/statue on the target square gets its own
    // report; only an otherwise empty square says "nothing special".
    if (!await its_dead(rx, ry, res))
        await update_topl('You hear nothing special.');
    return res.v;
}

// C ref: detect.c cvt_sdoor_to_door(lev) — an exposed secret door becomes an
// ordinary closed (or still-locked) door.  WM_MASK is the low wall-mode bits an
// SDOOR keeps in doormask.  js/dig.js and js/read.js each keep their own copy
// of this same six-line C function.
const WM_MASK = 0x07;
function cvt_sdoor_to_door(lev) {
    let newmask = (lev.doormask || 0) & ~WM_MASK;
    if (!(newmask & D_LOCKED)) newmask |= D_CLOSED;
    lev.typ = DOOR;
    lev.doormask = newmask;
}

// C ref: display.c unmap_invisible(x, y) — clear a remembered "sensed but
// unseen monster" mark.  Returns TRUE if there was one.
function unmap_invisible_at(x, y) {
    const loc = game.level?.at(x, y);
    if (!game.level?.flags?.hero_memory || !loc?.invisMon) return false;
    _display.unmap_object(x, y);
    _display.newsym(x, y);
    return true;
}

// C ref: cmd.c confdir(FALSE) — while confused (1-in-5) or stunned, the probed
// direction is replaced by a random one.  dirs_ord/xdir/ydir mirror cmd.js's
// private copies of the same C tables.
const DIRS_ORD_A = [0, 2, 4, 6, 1, 3, 5, 7];
const XDIR_A = [-1, -1, 0, 1, 1, 1, 0, -1];
const YDIR_A = [0, -1, -1, -1, 0, 1, 1, 1];
const PM_GRID_BUG_A = 116;
function confdir_apply(dir) {
    const u = game.u;
    const stunned = (u?.uprops?.Stun || 0) > 0 || !!u?.Stunned;
    const confused = (u?.uprops?.Confusion || 0) > 0;
    const impaired = stunned || (confused && !rn2(5));
    if (!impaired) return dir;
    const kmax = (u?.umonnum === PM_GRID_BUG_A) ? 4 : 8;
    const k = DIRS_ORD_A[rn2(kmax)];
    return { dx: XDIR_A[k], dy: YDIR_A[k], dz: 0 };
}

// C ref: trap.c ceiling(x, y) — "ceiling" over a room/wall/door, "rock cavern"
// elsewhere, "sky" on an air level (js/trap.js keeps the same private copy).
function ceiling_word(x, y) {
    const typ = game.level?.at(x, y)?.typ ?? 0;
    if (IS_AIR(typ)) return 'sky';
    if (IS_ROOM(typ) || IS_WALL(typ) || IS_DOOR(typ) || typ === SDOOR)
        return 'ceiling';
    return 'rock cavern';
}

// C ref: apply.c its_dead(rx, ry, resp) — report on a corpse or statue at
// (rx, ry).  Returns TRUE when it said something.  The Hallucination arm's
// obj_to_glyph(corpse, rn2) roll and the Blind map_object() are not modelled;
// the two ordinary arms (which is what a non-hallucinating hero always gets)
// are exact.  This whole function was missing, so `a<stethoscope>>` on a
// corpse pile printed "You hear nothing special." and never set ECMD_TIME.
async function its_dead(rx, ry, resp) {
    await loadDeps();
    const CORPSE_OTYP = 265; // mkobj.js OBJECT_DATA — corpse
    const objs = [];
    for (const o of (game.level?.objects || []))
        if (o && o.where === 'floor' && o.ox === rx && o.oy === ry) objs.push(o);
    let corpse = objs.find((o) => o.otyp === CORPSE_OTYP) || null;
    let statue = objs.find((o) => o.otyp === STATUE_OTYP) || null;
    if (corpse && statue) {
        // "when both are present, pick the uppermost one" — objs is already in
        // nexthere order, so whichever comes first wins.
        if (objs.indexOf(statue) < objs.indexOf(corpse)) corpse = null;
        else statue = null;
    }
    const more_corpses = corpse
        && objs.some((o) => o !== corpse && o.otyp === CORPSE_OTYP);
    if (!corpse && !statue) return false;

    const here = (game.u?.ux === rx && game.u?.uy === ry);
    if (corpse) {
        const one = ((corpse.quan || 1) === 1) && !more_corpses;
        // Role_if(PM_HEALER)'s REVIVE_MON timer check needs the timer subsystem.
        await _display.update_topl(
            `You determine that ${one ? (here ? 'this' : 'that')
                                     : (here ? 'these' : 'those')}`
            + ` unfortunate being${one ? '' : 's'} ${one ? 'is' : 'are'} dead.`);
        return true;
    }
    // C ref: apply.c:281 — the statue is named by its petrified MONSTER
    // (obj_pmname), not by the object type.  Blind / type_is_pname (a unique
    // monster, which takes no article) are not modelled.
    const { monster_by_pmidx } = await import('./makemon.js');
    const what = monster_by_pmidx(statue.corpsenm)?.name || 'statue';
    await _display.update_topl(`The ${what} is in fine health for a statue.`);
    return true;
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
    _invent.makeknown(SCR_BLANK_PAPER);

    // C ref: write.c:69 — getlin("What type of <typeword> do you want to
    // write?").  This is a BLOCKING line prompt: it eats every keystroke up to
    // the newline.  Skipping it (as this used to) handed all of them to the
    // command parser, which then ran that many phantom commands.
    const { hooked_tty_getlin } = await import('./extcmd-handlers.js');
    let namebuf = await hooked_tty_getlin(
        `What type of ${typeword} do you want to write?`, null);
    game._pending_message = '';
    if (namebuf == null || namebuf === '\x1b' || namebuf === '') return ECMD_TIME;
    let nm = namebuf.replace(/\s+/g, ' ').replace(/^ | $/g, '');
    if (!nm) return ECMD_TIME;
    if (/^scroll /i.test(nm)) nm = nm.slice(7);
    else if (/^spellbook /i.test(nm)) nm = nm.slice(10);
    if (/^of /i.test(nm)) nm = nm.slice(3);
    nm = nm.replace(/ armour/i, ' armor ').replace(/\s+/g, ' ').replace(/ $/, '');

    // C ref: write.c:98 — scan this object class's contiguous otyp range for a
    // name or appearance match, then a second pass over user-assigned names
    // (whose rn2(++deferralchance) tie-break is a real draw, but only once the
    // hero has #named a type).
    const eq = (a, b) => a != null && b != null && a.toLowerCase() === b.toLowerCase();
    let found = -1, real = 0, deferred = 0, deferralchance = 0;
    const inClass = [];
    for (let i = 0; i < objects.length; i++)
        if (objects[i] && objects[i].oclass === paper.oclass) inClass.push(i);
    for (const i of inClass) {
        const ocl = objects[i];
        if (!ocl.name) continue;
        if (eq(ocl.name, nm)) {
            if (ocl.oc_name_known || paper.oclass === SPBOOK_CLASS) { found = i; break; }
            real = deferred = i;
            break;
        }
        if (eq(apply_obj_descr(i), nm)) { found = i; break; }
    }
    if (found < 0) {
        for (const i of inClass) {
            const ocl = objects[i];
            if (ocl.oc_uname && eq(ocl.oc_uname, nm)
                && !(real && ocl.oc_name_known)
                && !rn2(++deferralchance))
                deferred = i;
        }
        if (deferred) found = deferred;
    }
    if (found < 0) {
        await _display.pline(`There is no such ${typeword}!`);
        return ECMD_TIME;
    }
    // A real match runs mksobj + cost() + rn1(basecost/2, basecost/2) + an rnl()
    // success roll; none of that is ported, so stop here rather than invent a
    // stream C does not draw.
    return ECMD_TIME;
}

// C ref: objclass.h OBJ_DESCR(objects[i]) — the (shuffled) appearance word.
// objnam.js keeps the same accessor but does not export it.
function apply_obj_descr(otyp) {
    const ocl = objects[otyp];
    if (!ocl) return null;
    const idx = ocl.oc_descr_idx != null ? ocl.oc_descr_idx : otyp;
    return DESCR_BY_OTYP[idx] ?? null;
}

// C ref: apply.c doapply() — the #apply ('a') command.  Returns an ECMD_* code.
export async function doapply() {
    await loadDeps();

    // check_capacity()/nohands() guards don't fire for the starter heroes.
    const obj = await _invent.getobj('use or apply', apply_ok);
    if (!obj) return ECMD_CANCEL;

    // C ref apply.c:4232-4240 — three class-level dispatches BEFORE the otyp
    // switch.  "You cannot apply that here." is not a NetHack string: printing
    // it put a fabricated topline on screen and, worse, swallowed the
    // confirmation / --More-- keystrokes that C's own handlers consume, so the
    // rest of the session read one keystroke ahead of C.
    if (obj.oclass === WAND_CLASS) return await do_break_wand(obj);
    if (obj.oclass === SPBOOK_CLASS) return await flip_through_book(obj);
    if (obj.oclass === COIN_CLASS) return await flip_coin(obj);

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
    // C ref apply.c:4277 — a carried sack / oilskin sack / bag of holding opens
    // the "Do what with your bag?" loot menu (use_container(&obj, TRUE, FALSE)).
    // Falling through to the yafm below handed the menu's keystrokes to the
    // command parser instead (seed0012 steps 259-264).
    if (obj.otyp === SACK_OTYP || obj.otyp === OILSKIN_SACK_OTYP
        || obj.otyp === BAG_OF_HOLDING_OTYP) {
        const { use_container_held } = await import('./extcmd-handlers.js');
        return await use_container_held(obj) ? ECMD_TIME : ECMD_OK;
    }

    if (obj.otyp === LOCK_PICK || obj.otyp === SKELETON_KEY || obj.otyp === CREDIT_CARD) {
        const r = await _cmd.pick_lock(obj);
        return r ? ECMD_TIME : ECMD_OK;
    }

    // C ref: apply.c:4340 — the ten musical instruments dispatch to
    // do_play_instrument() (music.c, now ported in full).
    if (INSTRUMENT_OTYPS.has(obj.otyp)) {
        const { do_play_instrument } = await import('./music.js');
        // music.js returns the REAL hack.h codes (ECMD_TIME 0x01); this file
        // renumbers them (ECMD_TIME 2) and cmd.js compares against THIS file's
        // ECMD export, so translate rather than passing the value through.
        const r = await do_play_instrument(obj);
        return (r & 0x01) ? ECMD_TIME : ECMD_OK;
    }

    // C ref apply.c:4400 default: — a polearm strikes at a distance, a
    // pick/axe digs.  Both are SUGGESTed by apply_ok(), so both are ordinary
    // picks at the "use or apply" prompt (a Knight's lance is invlet 'b', an
    // Archeologist's/dwarf's pick-axe is a starting item).
    if (_invent.is_pole(obj)) return await use_pole(obj, false);
    // C ref: apply.c:4292/4413 default: -> dig.c use_pick_axe(obj).
    if (_invent.is_pick(obj) || _invent.is_axe(obj)) {
        const { use_pick_axe, USE_PICK_AXE_REWIELDED, USE_PICK_AXE_DIG }
            = await import('./dig.js');
        const r = await use_pick_axe(obj);
        if (r === USE_PICK_AXE_REWIELDED) return await reapply_after_wield(obj);
        if (r === USE_PICK_AXE_DIG) return ECMD_TIME;
        return r === 1 ? ECMD_CANCEL : ECMD_OK;
    }

    // Any other tool isn't exercised; mirror C's "I don't know how to use that"
    // (C returns ECMD_FAIL here, which like ECMD_OK costs no turn).
    await _display.pline("Sorry, I don't know how to use that.");
    return ECMD_OK;
}

// C ref: apply.c flip_through_book(obj) — applying a spellbook.  Always costs
// the turn.  makeknown(SPE_BLANK_PAPER) on the blank arm is a real discovery
// (it changes later inventory/discoveries text), not just a message.
async function flip_through_book(obj) {
    await loadDeps();
    const hallu = !!game.u?.uhallu;
    const blind = (game.u?.blinded || 0) > 0 || !!game.ublindf;
    // C ref: objnam.c thesimpleoname(obj) — "the " + minimal_xname(), which
    // respects identification (an unknown book stays "the spellbook").
    // invent.js's xname() calls observe_object() as a side effect, which C's
    // does not, so use the observation-free accessor.
    await _display.pline(
        `You flip through the pages of the ${_invent.cxname_singular(obj)}.`);
    if (obj.otyp === SPE_BOOK_OF_THE_DEAD) {
        // Deaf is never set for these heroes.
        await _display.pline(`You hear the pages make an unpleasant ${
            hallu ? 'chuckling' : 'rustling'} sound.`);
    } else if (blind) {
        await _display.pline(`The pages feel ${
            hallu ? 'freshly picked' : 'rough and dry'}.`);
    } else if (obj.otyp === SPE_BLANK_PAPER) {
        await _display.pline(`This spellbook ${
            hallu ? "doesn't have much of a plot"
                  : 'has nothing written in it'}.`);
        _invent.makeknown(obj.otyp);
    } else if (hallu) {
        await _display.pline('You enjoy the animated initials.');
    } else if (obj.otyp === SPE_NOVEL) {
        await _display.pline('This looks like it might be interesting to read.');
    } else {
        // C ref: apply.c:4510 fadeness[] indexed by min(spestudied,
        // MAX_SPELL_STUDY); MAX_SPELL_STUDY is 4 (spell.h).
        const fadeness = ['fresh', 'slightly faded', 'very faded',
                          'extremely faded', 'barely visible'];
        const findx = Math.min(obj.spestudied || 0, 4);
        await _display.pline(`The${objects[obj.otyp]?.oc_magic ? ' magical' : ''
            } ink in this spellbook is ${fadeness[findx]}.`);
    }
    return ECMD_TIME;
}

// C ref: apply.c flip_coin(obj) — the coin-flipping easter egg.  Draws
// rn2(ACURR(A_DEX)) when Dex is below 10, then rn2(2) for heads/tails (or
// rn2(100) while hallucinating).  Always ECMD_TIME.
async function flip_coin(obj) {
    await loadDeps();
    const { acurr_eff } = await import('./attrib.js');
    const A_DEX = 3; // attrib.h — [Str,Int,Wis,Dex,Con,Cha]
    const dex = acurr_eff(A_DEX);
    await _display.pline(`You flip a ${_invent.cxname_singular(obj)}.`);
    let lose_coin = false;
    // Underwater is never true here.  Glib/Fumbling are the other slip causes.
    const slippery = ((game.u?.Glib || 0) > 0) || ((game.u?.uprops?.Glib || 0) > 0)
        || ((game.u?.uprops?.Fumbling || 0) > 0);
    if (slippery || (dex < 10 && !rn2(dex))) {
        await _display.pline(`It slips between your ${
            game.uarmg ? 'gloves' : 'fingers'}.`);
        lose_coin = true;
    }
    if (lose_coin) {
        // splitobj(otmp, 1) + dropx(otmp): dropping is not modelled here, so
        // the coin stays in the pack.  The message and the turn are right.
        return ECMD_TIME;
    }
    if (game.u?.uhallu) {
        await _display.pline(rn2(100) ? 'Wow, a double header!'
                             : 'The coin miraculously lands on its edge!');
    } else {
        await _display.pline(`It comes up ${rn2(2) ? 'heads' : 'tails'}.`);
    }
    return ECMD_TIME;
}

// C ref: apply.c do_break_wand(obj) — applying a wand breaks it.  The zap
// effects (bhitm/bhito over the 3x3 area, explosion, shop damage) are a whole
// unported subsystem, but the guards and the y/n confirmation in front of them
// are NOT: C blocks on "Are you really sure you want to break <wand>?" and
// consumes that keystroke.  Answering 'n' is fully faithful (ECMD_OK, no RNG);
// answering 'y' prints the break line and stops before the effects.
async function do_break_wand(obj) {
    await loadDeps();
    const { acurr_eff } = await import('./attrib.js');
    const A_STR = 0; // attrib.h — [Str,Int,Wis,Dex,Con,Cha]
    // C: objdescr_is(obj, "balsa") || objdescr_is(obj, "glass") — compares the
    // SHUFFLED appearance, so it must go through oc_descr_idx.
    const descr = apply_obj_descr(obj.otyp) || '';
    const is_fragile = /balsa|glass/.test(descr);
    if (acurr_eff(A_STR) < (is_fragile ? 5 : 10)) {
        await _display.pline(`You don't have the strength to break your ${
            _invent.cxname_singular(obj)}!`);
        return ECMD_OK;
    }
    const ans = await _display.y_n(
        `Are you really sure you want to break your ${_invent.cxname_singular(obj)}?`);
    if (ans !== 'y') return ECMD_OK;
    await _display.pline(
        `Raising your ${_invent.cxname_singular(obj)} high above your head,`
                         + ` you ${is_fragile ? 'snap' : 'break'} it in two!`);
    // zappable()/the per-otyp effect switch is unported; stop here rather than
    // invent an RNG stream C does not draw.
    return ECMD_TIME;
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
const LUCKSTONE = 470, LOADSTONE = 471, TOUCHSTONE = 472, FLINT = 473;
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

// C ref: apply.c calc_pole_range() — min is always 4; max grows with the
// wielded pole's weapon skill (4 at Unskilled/Basic, 5 Skilled, 8 Expert).
function calc_pole_range() {
    const min_range = 4;
    let max_range = 4;
    const typ = _enhance.uwep_skill_type();
    const lvl = typ ? _enhance.p_skill_of(typ) : 0;
    if (lvl >= P_EXPERT) max_range = 8;
    else if (lvl === P_SKILLED) max_range = 5;
    return { min_range, max_range };
}

// C ref: display.h glyph_is_poleable(G) — a displayed monster, a remembered
// "sensed but unseen monster" mark, or a statue.  This port keeps no glyph
// array, so the same three cases are read off the level state.
function poleable_at(x, y) {
    const loc = game.level?.at(x, y);
    if (loc?.invisMon) return true;
    const mtmp = _display.m_at(x, y);
    if (mtmp && _uhitm.canspotmon(mtmp)) return true;
    return statue_at(x, y);
}

function statue_at(x, y) {
    for (const o of (game.level?.objects || []))
        if (o && o.otyp === STATUE_OTYP && o.ox === x && o.oy === y) return true;
    return false;
}

function distu_sq(x, y) {
    const dx = x - (game.u?.ux ?? 0), dy = y - (game.u?.uy ?? 0);
    return dx * dx + dy * dy;
}

// C ref: apply.c get_valid_polearm_position(x, y).
function valid_polearm_position(x, y, min_range, max_range) {
    if (!(x >= 0 && x < 80 && y >= 0 && y < 21)) return false;
    const d = distu_sq(x, y);
    if (d < min_range || d > max_range) return false;
    return _vision.cansee(x, y)
        || (_vision.couldsee(x, y) && poleable_at(x, y));
}

// C ref: apply.c find_poleable_mon(pos) — scan the isqrt(max_range) box for
// EXACTLY ONE poleable square; two or more candidates means "can't guess", so
// the caller's cc stays where it was.  Tame/peaceful monsters are skipped
// unless the hero is impaired.  No RNG.
function find_poleable_mon(pos, min_range, max_range) {
    const u = game.u;
    const impaired = !!(game.u?.uconf || game.u?.ustun || game.Hallucination);
    const rt = Math.floor(Math.sqrt(max_range));
    const lo_x = Math.max(u.ux - rt, 1), hi_x = Math.min(u.ux + rt, 79);
    const lo_y = Math.max(u.uy - rt, 0), hi_y = Math.min(u.uy + rt, 20);
    let mx = 0, my = 0;
    for (let x = lo_x; x <= hi_x; ++x) {
        for (let y = lo_y; y <= hi_y; ++y) {
            if (!valid_polearm_position(x, y, min_range, max_range)) continue;
            const mtmp = _display.m_at(x, y);
            if (!impaired && mtmp && _uhitm.canspotmon(mtmp)
                && (mtmp.mtame || (mtmp.mpeaceful && game.flags?.confirm !== false)))
                continue;
            const isStatue = statue_at(x, y);
            if (poleable_at(x, y) && (!isStatue || impaired)) {
                if (mx) return false; /* more than one candidate location */
                mx = x; my = y;
            }
        }
    }
    if (!mx) return false;
    pos.x = mx; pos.y = my;
    return true;
}

// C ref: dig.c use_pick_axe():1100 and apply.c use_pole():3441 — a weapon-tool
// that had to be wielded first re-queues its own command:
//     cmdq_add_ec(CQ_CANNED, doapply); cmdq_add_key(CQ_CANNED, obj->invlet);
//     return ECMD_TIME;
// rhack() returns, moveloop_core() spends the turn the wield cost, and the next
// rhack() dispatches the queued doapply without reading a key — so the whole
// thing is ONE input boundary for the player.  invent.js dofire() models the
// same cmdq_add_ec pair this way.
async function reapply_after_wield(obj) {
    const { moveloop_turn } = await import('./allmain.js');
    game.context = game.context || {};
    game.context.move = 0;
    await moveloop_turn();
    // C ref: allmain.c moveloop_core() tail — `if (disp.botl || disp.botlx)
    // bot();` runs after the turn and before the next rhack(), so the queued
    // command's first frame already carries the new turn counter.
    await _display.flush_screen(1);
    // getobj()'s cmdq fast path pops this invlet instead of drawing a prompt.
    _invent.cmdq_add_key(CQ_CANNED, obj.invlet);
    return await doapply();
}

// C ref: apply.c use_pole(obj, autohit) — reached from dofire() as
// use_pole(uwep, TRUE) when the quiver is empty and a polearm is wielded.
// With autohit set there is NO "Where do you want to hit?" prompt and no
// getpos(): the target is whatever find_poleable_mon() uniquely picks, else
// the last-hit monster, else the hero's own square — which is why an empty
// room answers "Don't know what to hit."  RNG-free unless a hit lands.
export async function use_pole(obj, autohit) {
    await loadDeps();
    const u = game.u;

    if (obj !== game.uwep) {
        // C ref: apply.c:3443 — an unwielded polearm is wielded first
        // ("You now wield a lance."), then doapply is re-queued on the canned
        // command stack so the second pass takes the obj == uwep branch.
        // dofire() only ever calls this with uwep, so before doapply()
        // dispatched here this arm was dead code that returned silently.
        if (await _invent.wield_tool(obj, 'swing')) {
            // C: cmdq_add_ec(CQ_CANNED, doapply); cmdq_add_key(CQ_CANNED,
            // obj->invlet); return ECMD_TIME -> moveloop spends the wield turn,
            // then rhack() pops the queue and re-runs doapply with obj == uwep,
            // reaching the "spot to hit" getpos.  No nhgetch separates them.
            return await reapply_after_wield(obj);
        }
        return ECMD_OK;
    }
    const { min_range, max_range } = calc_pole_range();

    if (!autohit) await _display.update_topl('Where do you want to hit?');
    const cc = { x: u.ux, y: u.uy };
    const hitm = game.context?.polearm_hitmon;
    if (!find_poleable_mon(cc, min_range, max_range) && hitm && !hitm.mdead
        && _uhitm.canspotmon(hitm)
        && distu_sq(hitm.mx, hitm.my) <= max_range
        && distu_sq(hitm.mx, hitm.my) >= min_range) {
        cc.x = hitm.mx; cc.y = hitm.my;
    }
    if (!autohit) {
        // C ref: apply.c:3463 — getpos_sethilite(display_polearm_positions,
        // get_valid_polearm_position) then getpos(&cc, TRUE, "the spot to
        // hit").  Without this the targeting keystrokes fell through to the
        // command parser and ran phantom turns.  The getpos_sethilite() part
        // (which moves the FIRST frame's cursor onto the last hilited cell,
        // the way hack.js jump_hilite_first_cursor() does for #jump) is still
        // missing, so frame 1's cursor sits on the hero.
        const { getpos } = await import('./hack.js');
        const picked = await getpos('the spot to hit', cc.x, cc.y,
                                    (x, y) => valid_polearm_position(
                                        x, y, min_range, max_range),
                                    /*force=*/true,
                                    /*verbose=*/game.flags?.verbose !== false);
        if (!picked) return ECMD_CANCEL; // ESC
        cc.x = picked.x; cc.y = picked.y;
    }

    const d = distu_sq(cc.x, cc.y);
    if (d > max_range) {
        await _display.update_topl('Too far!');
        return ECMD_OK;
    } else if (d < min_range) {
        if (autohit && cc.x === u.ux && cc.y === u.uy)
            await _display.update_topl("Don't know what to hit.");
        else
            await _display.update_topl('Too close!');
        return ECMD_OK;
    } else if (!_vision.cansee(cc.x, cc.y) && !poleable_at(cc.x, cc.y)) {
        await _display.update_topl("You won't hit anything if you can't see that spot.");
        return ECMD_OK;
    } else if (!_vision.couldsee(cc.x, cc.y)) {
        await _display.update_topl("You can't reach that spot from here.");
        return ECMD_OK;
    }

    // A reachable target square: C runs attack_checks()/thitmonst() (or the
    // statue/boulder/terrain "Thump!" arms).  thitmonst() is not ported, so
    // stop here rather than invent an RNG stream C does not draw.
    return ECMD_TIME;
}

export const ECMD = { ECMD_OK, ECMD_CANCEL, ECMD_TIME };
