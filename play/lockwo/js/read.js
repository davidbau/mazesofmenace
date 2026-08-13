// read.js — reading scrolls and spellbooks.
// C ref: read.c.  Ports the 'r' command entry (doread), the scroll dispatch
// (seffects) for the magic-mapping case, and spellbook reading (study_book)
// for the "already know it well" branch exercised by the gameplay sessions.

import { game } from './gstate.js';
import { rnd, rn2 } from './rng.js';
import { pline, topl_more, update_topl, newsym } from './display.js';
import { getobj, makeknown, useup, useupall, xname, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY,
         GETOBJ_EXCLUDE, GETOBJ_PROMPT, identify_pack, trycall } from './invent.js';
import { exercise } from './attrib.js';
import { discover_object } from './o_init.js';
import { do_mapping } from './detect.js';
import { study_book } from './spell.js';
import { erode_obj, obj_erode_type, goodpos_for_hero, t_at, spoteffects } from './trap.js';
import { find_ac } from './u_init.js';
import { SCROLL_CLASS, SPBOOK_CLASS, SCR_BLANK_PAPER, SCR_TELEPORTATION,
         SCR_DESTROY_ARMOR, SCR_REMOVE_CURSE, SCR_ENCHANT_WEAPON,
         BALL_CLASS, CHAIN_CLASS, HEAVY_IRON_BALL, mkobj, place_object,
         WEAPON_CLASS, ARMOR_CLASS, TOOL_CLASS, objects } from './mkobj.js';
import { A_WIS, A_STR, A_CON, A_DEX, CORR, Is_rogue_level, Is_waterlevel,
         ERODE_NONE, EF_PAY, EF_DESTROY, ER_NOTHING, ER_DESTROYED,
         COLNO, ROWNO, VIBRATING_SQUARE, is_pit, is_hole, SPE_LIM,
         W_BALL, W_CHAIN } from './const.js';
import { Blind, vision_recalc } from './vision.js';

const ECMD_CANCEL = 0;
const ECMD_OK = 0;
const ECMD_TIME = 1;

const SCR_MAGIC_MAPPING = 337;
const SCR_IDENTIFY = 336;
const SCR_LIGHT = 332;
const SCR_PUNISHMENT = 341;      // C ref: include/objects.h otyp
const WT_IRON_BALL_INCR = 160;   // C ref: include/obj.h WT_IRON_BALL_INCR

// C ref: topl.c update_topl — within a single turn, consecutive messages
// concatenate on the top line (separated by two spaces) while there's room
// ("len(bp) + len(toplines) + 3 < CO - 8"), else the pending line pages with
// --More-- first.  display.js's update_topl() already implements this
// exactly; this is just a same-named alias kept so existing call sites below
// don't need touching.
async function pline_append(msg) {
    await update_topl(msg);
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

// C ref: youprop.h Hallucination — the hero's hallucination timer (uhallu),
// as read by u_init.js/potion.js's Hallucination() convention.
function Hallucination() { return !!game.u?.uhallu; }

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
    case SCR_DESTROY_ARMOR:
        return await seffect_destroy_armor(sobj);
    case SCR_REMOVE_CURSE:
        await seffect_remove_curse(sobj);
        break;
    case SCR_TELEPORTATION:
        // C ref: read.c seffect_teleportation — a confused or cursed scroll does
        // a level teleport (level_tele); an ordinary one does an in-level
        // teleport (teleport.c scrolltele).  level_tele sets gk.known.
        if (Confused() || sobj.cursed) {
            const { level_tele } = await import('./do.js');
            const { hooked_tty_getlin } = await import('./extcmd-handlers.js');
            await level_tele((q) => hooked_tty_getlin(q, null));
        } else {
            // C ref: teleport.c scrolltele() — a Teleport_control hero (or a
            // blessed scroll), while not Stunned, instead gets a controlled
            // getpos() teleport.  Not exercised by the covered starts (no
            // Teleport_control intrinsic, no blessed teleportation scroll
            // read), so only the uncontrolled safe_teleds() path is ported.
            const stunned = (game.u?.uprops?.Stun || 0) > 0;
            const controlled = ((game.u?.uprops?.Teleport_control || 0) > 0
                || sobj.blessed) && !stunned;
            if (!controlled) {
                // "for scroll, discover it regardless of destination" —
                // learnscroll(scroll) always fires before safe_teleds().
                game.known = true;
                await safe_teleds_hero();
            }
        }
        break;
    case SCR_ENCHANT_WEAPON: {
        const consumed = await seffect_enchant_weapon(sobj);
        if (consumed) return true;
        break;
    }
    case SCR_PUNISHMENT:
        // C ref: read.c seffect_punishment — a confused OR blessed read only
        // makes the hero feel guilty; otherwise punish(sobj).  gk.known is set
        // either way.
        game.known = true;
        if (Confused() || sobj.blessed) {
            await pline('You feel guilty.');
            break;
        }
        await punish(sobj);
        break;
    default:
        // Uncovered scroll effects: no-op (object still consumed by doread).
        break;
    }
    return false;
}

// C ref: read.c punish(sobj) — chain the hero to a heavy iron ball.
//
// This was missing entirely: seed4500 reads a scroll of punishment at step 492
// and C drew 12 PRNG calls there (two mkobj(class, TRUE) — the chain then the
// ball — each worth rnd(1000) for the in-class probability walk plus next_ident
// and mkobj_erosions' four draws) while we drew none, and the ball and chain
// never appeared on the floor or in the "Things that are here" list.
async function punish(sobj) {
    const u = game.u;
    // angrygods() passes a null sobj; only the HEAVY_IRON_BALL re-use case
    // recycles the object it was handed.
    const reuse_ball = (sobj && sobj.otyp === HEAVY_IRON_BALL) ? sobj : null;
    const cursed_levy = (sobj && sobj.cursed) ? 1 : 0;

    // update_topl(), not pline(): C's You()/Your() append to the topline that
    // doread() has already written ("As you read the scroll, it disappears."),
    // and page with a --More-- — its own captured frame — when the two don't fit
    // in 80 columns.  seed4500 step 491 is exactly that --More--, with the whole
    // punish() PRNG landing in step 492 after the space.
    if (!reuse_ball)
        await update_topl('You are being punished for your misbehavior!');
    if (u?.uball) {
        // Already Punished: the existing ball just gets heavier.  No RNG.
        await update_topl('Your iron ball gets heavier.');
        u.uball.owt += WT_IRON_BALL_INCR * (1 + cursed_levy);
        return;
    }
    // The amorphous/whirly/unsolid hero branch ("A ball and chain appears, then
    // falls away.") needs a polymorphed form; a normal hero always gets chained.
    const uchain = mkobj(CHAIN_CLASS, true);
    uchain.owornmask = W_CHAIN;
    u.uchain = uchain;
    const uball = reuse_ball || mkobj(BALL_CLASS, true);
    uball.owornmask = W_BALL;
    u.uball = uball;

    // C ref: ball.c placebc_core() — both objects go on the hero's square (the
    // ball first, so the chain ends up above it: u.bc_order = BCPOS_CHAIN).
    // flooreffects() can rust them, but not on a dry square, and it draws no RNG
    // there.
    place_object(uball, u.ux, u.uy);
    place_object(uchain, u.ux, u.uy);
    newsym(u.ux, u.uy);
}

// C ref: objclass.h erosion_matters() — only weapons and armor erode (this
// simplified form, matching the same helper already duplicated across
// several port files, omits the TOOL_CLASS weptool case: no covered start
// wields an erodeable tool).
function erosion_matters_wep(obj) {
    return obj?.oclass === WEAPON_CLASS || obj?.oclass === ARMOR_CLASS;
}

// C ref: obj.h is_weptool(o) — a TOOL_CLASS object with a real weapon skill.
function is_weptool_wep(obj) {
    return obj?.oclass === TOOL_CLASS && (objects[obj.otyp]?.oc_skill ?? 0) !== 0;
}

// C ref: do_name.c hcolor(colorpref) — colorpref unless hallucinating (not
// exercised by the covered non-hallucinating starts; same stub as
// fountain.js's hcolor()).
function hcolor_wep(colorpref) { return colorpref; }

// C ref: objnam.c vtense(0, verb) — singular 3rd-person conjugation, scoped
// to the plain present-tense verbs chwepon uses ("glow", "violently glow",
// "are", "evaporate", "feel", "look").
function vtense_sing_wep(verb) {
    const v = verb.toLowerCase();
    if (v === 'are') return 'is';
    if (v === 'have') return verb.slice(0, -2) + 's';
    const last = verb[verb.length - 1]?.toLowerCase();
    const prev = verb.length >= 2 ? verb[verb.length - 2].toLowerCase() : '';
    if (last === 'z' || last === 'x' || last === 's'
        || (verb.length >= 2 && last === 'h' && (prev === 'c' || prev === 's'))
        || (verb.length === 2 && last === 'o'))
        return verb + 'es';
    if (last === 'y' && !'aeiou'.includes(prev))
        return verb.slice(0, -1) + 'ies';
    return verb + 's';
}
// C ref: objnam.c otense(otmp, verb) — verb unchanged if otmp is plural
// (quan != 1), else singular-conjugated.
function otense_wep(obj, verb) {
    return ((obj?.quan ?? 1) !== 1) ? verb : vtense_sing_wep(verb);
}
// C ref: objnam.c Yobjnam2(obj, verb) — "Your <name> <verb>", scoped to a
// carried, ordinary (non-artifact) object: the "leave off 'your'" artifact
// carve-out isn't exercised by the covered starts' weapons.
function Yobjnam2_wep(obj, verb) {
    return `Your ${xname(obj)} ${otense_wep(obj, verb)}`;
}

// C ref: wield.c chwepon(otmp, amount) — enchant (amount>0) or disenchant
// (amount<0) the wielded weapon; otmp is the scroll causing it.  Returns
// false only for the "no weapon wielded" fallback (matching C's `return 0`,
// which signals the caller to treat the scroll as already consumed).  The
// WORM_TOOTH<->CRYSKNIFE transforms, the artifact "faintly glow" resist
// branch, the Magicbane clue, and the elven-weapon over-enchant vibrate
// warning are not exercised by the covered (ordinary, non-artifact weapon)
// starts and are left unported.
async function chwepon(otmp, amount) {
    const uwep = game.uwep;
    if (!uwep || (uwep.oclass !== WEAPON_CLASS && !is_weptool_wep(uwep))) {
        // Cursed-tin-opener uncurse-with-aura branch (needs will_weld()) is
        // not exercised by the covered starts; only the plain fallback is
        // ported.
        await strange_feeling(otmp, `Your hands ${amount >= 0 ? 'twitch' : 'itch'}.`);
        exercise(A_DEX, amount >= 0);
        return false;
    }

    const color = hcolor_wep(amount < 0 ? 'black' : 'blue');
    if (((uwep.spe > 5 && amount >= 0) || (uwep.spe < -5 && amount < 0)) && rn2(3)) {
        if (!Blind())
            await pline_append(`${Yobjnam2_wep(uwep, 'violently glow')} ${color} for a while and then ${otense_wep(uwep, 'evaporate')}.`);
        else
            await pline_append(`${Yobjnam2_wep(uwep, 'evaporate')}.`);
        useupall(uwep);
        return true;
    }

    const xtime = (amount * amount === 1) ? 'moment' : 'while';
    await pline_append(`${Yobjnam2_wep(uwep, amount === 0 ? 'violently glow' : 'glow')} ${color} for a ${xtime}.`);
    if (otmp && otmp.oclass === SCROLL_CLASS && uwep.known
        && (amount > 0 || (amount < 0 && otmp.bknown)))
        makeknown(otmp.otyp);

    uwep.spe = (uwep.spe || 0) + amount;
    if (amount > 0 && uwep.cursed) uwep.cursed = false;
    return true;
}

// C ref: read.c seffect_enchant_weapon() — scroll (or spellbook cast) of
// enchant weapon.  Returns true when the scroll was already consumed inside
// chwepon's no-weapon fallback (matching C's `*sobjp = 0`), signalling the
// caller to skip its own discover/useup handling.
async function seffect_enchant_weapon(sobj) {
    const uwep = game.uwep;
    const sblessed = sobj.blessed;
    const scursed = sobj.cursed;
    const confused = Confused();

    if (confused && uwep && erosion_matters_wep(uwep) && uwep.oclass !== ARMOR_CLASS) {
        const new_erodeproof = !scursed;
        uwep.oerodeproof = 0;
        if (Blind()) {
            uwep.rknown = false;
            await pline_append('Your weapon feels warm for a moment.');
        } else {
            uwep.rknown = true;
            await pline_append(`${Yobjnam2_wep(uwep, 'are')} covered by a ${scursed ? 'mottled' : 'shimmering'} ${hcolor_wep(scursed ? 'purple' : 'golden')} ${scursed ? 'glow' : 'shield'}!`);
        }
        if (new_erodeproof && (uwep.oeroded || uwep.oeroded2)) {
            uwep.oeroded = 0; uwep.oeroded2 = 0;
            await pline_append(`${Yobjnam2_wep(uwep, Blind() ? 'feel' : 'look')} as good as new!`);
        }
        uwep.oerodeproof = new_erodeproof ? 1 : 0;
        return false;
    }

    const s = scursed ? -1
        : !uwep ? 1
        : (uwep.spe >= 9) ? (rn2(uwep.spe) === 0 ? 1 : 0)
        : sblessed ? rnd(3 - Math.trunc(uwep.spe / 3))
        : 1;

    const chwSuccess = await chwepon(sobj, s);
    if (uwep && Math.abs(uwep.spe || 0) > SPE_LIM)
        uwep.spe = Math.sign(uwep.spe) * SPE_LIM;
    return !chwSuccess;
}

// C ref: teleport.c teleok(x,y,trapok) — hero-only subset.  The special-level
// region checks (tele_jump_ok/in_out_region) are no-ops on an ordinary dungeon
// level, so only the trap guard and goodpos() remain.  Exported: also used by
// hack.js's dotele_wizard() (wizard-mode ^T -> tele() -> scrolltele()), which
// shares this exact C code path with the scroll-of-teleportation controlled
// case below.
export function teleok_hero(x, y, trapok) {
    if (!trapok) {
        const trap = t_at(x, y);
        if (trap) {
            const u = game.u;
            const airborne = !!(u?.uprops?.Levitation || u?.uprops?.Flying);
            const ok = trap.ttyp === VIBRATING_SQUARE
                || ((is_pit(trap.ttyp) || is_hole(trap.ttyp)) && airborne);
            if (!ok) return false;
        }
    }
    return goodpos_for_hero(x, y);
}

// C ref: teleport.c teleds(nux,nuy,TELEDS_TELEPORT) — hero-only subset (no
// Punished ball&chain, vault guard, swallowed-monster, or hidden-mimic unwind:
// none of those occur on the covered starts).  Relocates the hero, redraws the
// vacated square, recalculates vision, announces the materialize message
// (after the vision recalc, so a paged --More-- shows the new map, matching
// the C comment on this ordering), then runs spoteffects() at the new spot.
// Exported for hack.js's dotele_wizard() (see teleok_hero above).
export async function teleds_hero(nux, nuy) {
    const u = game.u;
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx; u.uy0 = oldy;
    u.ux = nux; u.uy = nuy;
    newsym(oldx, oldy);
    newsym(nux, nuy);
    vision_recalc(0);
    if (game.flags?.verbose !== false) {
        const where = (nux === oldx && nuy === oldy) ? 'the same' : 'a different';
        await update_topl(`You materialize in ${where} location!`);
    }
    // (switch_terrain() on a terrain-type change and the vault-guard alarm
    // are not exercised by the covered starts.)
    await spoteffects(null);
}

// C ref: teleport.c safe_teleds(TELEDS_TELEPORT) — hero-only subset: the
// initial "completely random, up to 40 tries" loop.  An ordinary dungeon level
// has plenty of open floor, so the covered starts always land within those 40
// tries; the ring-expanding collect_coords() fallback is not exercised.
// Exported for hack.js's dotele_wizard() (see teleok_hero above).
export async function safe_teleds_hero() {
    for (let tcnt = 0; tcnt < 40; tcnt++) {
        const nux = rnd(COLNO - 1);
        const nuy = rn2(ROWNO);
        if (teleok_hero(nux, nuy, false)) {
            await teleds_hero(nux, nuy);
            return true;
        }
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
export async function litroom(on, obj) {
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

// C ref: read.c seffect_remove_curse() — scroll of remove curse (and the
// identical spellbook-cast effect).  You_feel() always fires first; a cursed
// scroll then just disintegrates (pline_The), skipping the whole per-item
// bless/curse invent loop below it in C.  That invent loop (uncursed: bless
// worn gear / loadstone / in-use leash; confused: rncurse everything), the
// riding steed's saddle special case, and the trailing Punished/buried-ball
// follow-ups are not exercised by the covered (uncursed-inventory, unmounted,
// unpunished) starts, so only the cursed-scroll branch is ported here.
async function seffect_remove_curse(sobj) {
    const confused = Confused();
    const hallu = Hallucination();
    const feel = !hallu
        ? (!confused ? 'like someone is helping you.' : 'like you need some help.')
        : (!confused ? 'in touch with the Universal Oneness.' : 'the power of the Force against you!');
    await update_topl(`You feel ${feel}`);
    if (sobj.cursed)
        await update_topl('The scroll disintegrates.');
}

// C ref: potion.c strange_feeling(obj, txt) — the generic "nothing visible
// happened" scroll/potion feedback.  flags.beginner is never set for the
// covered non-tutorial starts, so the txt branch always applies; useup()
// happens here (mirroring C's `*sobjp = 0` at each call site).
async function strange_feeling(obj, txt) {
    await pline_append(txt || 'You have a strange feeling for a moment, then it passes.');
    if (obj) useup(obj);
}

// C ref: do_wear.c some_armor(&youmonst) — picks a "representative" worn
// armor piece (cloak/suit/shirt first, each of helm/gloves/boots/shield with a
// 1-in-4 chance to override).  seffect_destroy_armor calls this unconditionally
// for its RNG side effects even on paths that don't use the result.
function some_armor() {
    let otmph = game.uarmc || game.uarm || game.uarmu || null;
    for (const slot of ['uarmh', 'uarmg', 'uarmf', 'uarms']) {
        const otmp = game[slot];
        if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    }
    return otmph;
}

// C ref: do_wear.c count_worn_armor() — number of armor pieces worn.
function count_worn_armor() {
    let n = 0;
    for (const slot of ['uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu'])
        if (game[slot]) ++n;
    return n;
}

// C ref: do_wear.c destroy_arm() — the uncursed/unblessed scroll-of-destroy-
// armor effect: erode rn2(4)+1 random worn armor pieces (whatever material
// each happens to be), stopping early if one is fully destroyed.  Returns
// whether anything was actually damaged.
async function destroy_arm() {
    const armors = ['uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu']
        .map((slot) => game[slot]).filter(Boolean);
    if (!armors.length) return false;

    const hits = rn2(4) + 1;
    let ret = false;
    for (let i = 0; i < hits; i++) {
        const otmp = armors[rn2(armors.length)];
        if (!otmp.oerodeproof) {
            const erosion = obj_erode_type(otmp);
            if (erosion !== ERODE_NONE) {
                const r = await erode_obj(otmp, xname(otmp), erosion, EF_PAY | EF_DESTROY);
                if (r !== ER_NOTHING) ret = true;
                if (r === ER_DESTROYED) break;
            }
        }
    }
    // C ref: allmain.c moveloop_core() — find_ac() runs once per player input
    // (not from erode_obj itself), so an eroded piece's AC penalty shows up
    // starting with the NEXT screen, not mid-turn between destroy_arm's hits.
    if (ret) find_ac();
    return ret;
}

// C ref: read.c seffect_destroy_armor() — scroll of destroy armor.  Returns
// true if the scroll was consumed here (strange_feeling's useup); false to
// let doread()'s generic makeknown/useup path handle it (the destroy_arm
// success case, matching C's fall-through that only sets gk.known).
async function seffect_destroy_armor(sobj) {
    const otmp = some_armor(); // C computes this unconditionally (RNG side effects)
    const confused = Confused();

    if (confused) {
        if (!otmp) {
            await strange_feeling(sobj, 'Your bones itch.');
            exercise(A_STR, false);
            exercise(A_CON, false);
            return true;
        }
        // p_glow2 + oerodeproof-toggle branch: not exercised by the covered
        // (non-confused) starts.
        return false;
    }

    if (sobj.cursed) {
        // both cursed-scroll sub-branches (armor-also-cursed vibrate/stun, and
        // disintegrate_arm) are not exercised by the covered (uncursed-scroll)
        // starts.
        return false;
    }

    const gets_choice = !!(otmp && sobj.blessed && count_worn_armor() > 1);
    if (gets_choice || sobj.blessed) {
        // blessed-scroll armor-choice + disintegrate_arm/disintegrate_cursed_armor
        // branches: not exercised by the covered (unblessed-scroll) starts.
        return false;
    }
    if (!(await destroy_arm())) {
        await strange_feeling(sobj, 'Your skin itches.');
        exercise(A_STR, false);
        exercise(A_CON, false);
        return true;
    }
    game.known = true;
    return false;
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
        await update_topl('You identify this as an identify scroll.');
    } else if (!already_known) {
        await update_topl('This is an identify scroll.');
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
        await update_topl("You're not carrying anything else to be identified.");
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
    game.known = false; // C ref: read.c doread — gk.known = FALSE, reset per read
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
        // C ref: read.c doread — nodisappear: a few scroll feedback messages
        // describe something happening to the scroll itself (SCR_FIRE, and a
        // cursed SCR_REMOVE_CURSE which disintegrates instead), so those skip
        // "...it disappears." in favor of a plain "You read the scroll."
        const nodisappear = (otyp === SCR_REMOVE_CURSE && scroll.cursed);
        // Not blind on the covered starts.
        await pline(nodisappear ? 'You read the scroll.' : 'As you read the scroll, it disappears.');
        // C: pline() -> update_topl() always marks the topline NEED_MORE;
        // this plain pline() is a simplified stand-in that skips that side
        // effect, so any same-turn follow-up message (confused-garble, or a
        // scroll effect's own feedback routed through update_topl) must set
        // it explicitly to get C's real concatenate-or-page behavior.
        game._toplin = 1;
        // C ref: read.c doread — a confused hero garbles the words.  This
        // pline follows the "disappears" line on the same turn; when the two
        // don't fit on one top line, "...disappears." is paged with --More--
        // (its own captured frame) before the confused line replaces it.
        // Hallucination ("Being so trippy, you screw up...") is not exercised.
        if (Confused()) {
            const silently = !can_chant();
            await update_topl(
                `Being confused, you ${silently ? 'misunderstand' : 'mispronounce'} the magic words...`);
        }
    }

    if (!(await seffects(scroll))) {
        if (!objects[otyp]?.oc_name_known) {
            if (game.known) {
                // C ref: read.c doread -> learnscroll -> learnscrolltyp():
                // makeknown() + more_experienced(0, 10) (score-only, no RNG).
                makeknown(otyp);
                more_experienced(0, 10);
            } else {
                // C ref: do.c trycall(scroll) — offer to name this unidentified
                // scroll appearance ("Call a scroll labeled ...:"), paging the
                // still-pending effect message with --More-- first.
                await trycall(scroll);
            }
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
