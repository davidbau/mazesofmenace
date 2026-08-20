// read.js — reading scrolls and spellbooks.
// C ref: read.c.  Ports the 'r' command entry (doread), the scroll dispatch
// (seffects) and spellbook reading (study_book, in spell.js).
// Still unported in seffects(): SCR_GENOCIDE, SCR_CHARGING, SCR_FIRE,
// SCR_EARTH, SCR_STINKING_CLOUD, SCR_TAMING and the two detection scrolls —
// each needs a helper that does not exist yet in the port (do_genocide/getlin,
// recharge(), explode(), drop_boulder_on_*(), getpos(), tamedog(), and
// detect.c's gold_detect/food_detect/trap_detect respectively).

import { game } from './gstate.js';
import { rnd, rn2, rn1, d } from './rng.js';
import { pline, topl_more, update_topl, newsym } from './display.js';
import { getobj, makeknown, useup, useupall, xname, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY,
         GETOBJ_EXCLUDE, GETOBJ_PROMPT, identify_pack, trycall, near_capacity,
         remove_worn_item, makeplural } from './invent.js';
import { exercise } from './attrib.js';
import { discover_object } from './o_init.js';
import { do_mapping } from './detect.js';
import { study_book } from './spell.js';
import { erode_obj, obj_erode_type, goodpos_for_hero, t_at, spoteffects } from './trap.js';
import { find_ac } from './u_init.js';
import { SCROLL_CLASS, SPBOOK_CLASS, SCR_BLANK_PAPER, SCR_TELEPORTATION,
         SCR_DESTROY_ARMOR, SCR_REMOVE_CURSE, SCR_ENCHANT_WEAPON,
         SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER, SCR_SCARE_MONSTER,
         BALL_CLASS, CHAIN_CLASS, HEAVY_IRON_BALL, mkobj, place_object,
         WEAPON_CLASS, ARMOR_CLASS, TOOL_CLASS, COIN_CLASS, WAND_CLASS,
         POTION_CLASS, RING_CLASS, objects,
         bless, curse, uncurse, blessorcurse, weight } from './mkobj.js';
import { A_WIS, A_STR, A_CON, A_DEX, A_INT, CORR, Is_rogue_level, Is_waterlevel,
         ERODE_NONE, EF_PAY, EF_DESTROY, ER_NOTHING, ER_DESTROYED,
         COLNO, ROWNO, VIBRATING_SQUARE, is_pit, is_hole, SPE_LIM,
         W_BALL, W_CHAIN, SDOOR, DOOR, D_CLOSED, D_LOCKED, isok,
         G_GONE } from './const.js';
import { Blind, vision_recalc, cansee } from './vision.js';
import { mflags1_of, msound_of, M1_NOHEAD } from './monflags_data.js';
import { mon_mr } from './monmr_data.js';

const ECMD_CANCEL = 0;
const ECMD_OK = 0;
const ECMD_TIME = 1;

// C ref: include/objects.h otyp (JS mkobj.js OBJECT_DATA numbering, which
// carries SCR_MAIL like the recorder's MAIL_STRUCTURES build does).
const SCR_MAGIC_MAPPING = 337;
const SCR_IDENTIFY = 336;
const SCR_LIGHT = 332;
const SCR_PUNISHMENT = 341;
const SCR_CREATE_MONSTER = 329;
const SCR_GOLD_DETECTION = 334;
const SCR_AMNESIA = 338;
const SCR_MAIL = 364;
const SPE_CONFUSE_MONSTER = 377;
const SPE_CREATE_MONSTER = 382;
const SPE_CAUSE_FEAR = 384;
const SPE_REMOVE_CURSE = 395;
const SPE_MAGIC_MAPPING = 396;
const SPE_IDENTIFY = 397;
const SPE_BLANK_PAPER = 407;
const SPE_NOVEL = 408;
const SPE_BOOK_OF_THE_DEAD = 409;
const FORTUNE_COOKIE = 289;
const CAN_OF_GREASE = 240;
const LOADSTONE = 471;
const LEASH = 236;
const POT_WATER = 322;

const WT_IRON_BALL_INCR = 160;   // C ref: include/obj.h WT_IRON_BALL_INCR
const ALL_SPELLS = 1;            // C ref: read.c forget() howmuch bit
const EXT_ENCUMBER = 4;          // C ref: hack.h EXT_ENCUMBER (Overtaxed)
const WM_MASK = 0x07;            // C ref: rm.h WM_MASK (wall mode bits in an SDOOR's doormask)
const PM_ACID_BLOB = 6, PM_YELLOW_LIGHT = 118, PM_BLACK_LIGHT = 119;
// C ref: hack.h makemon() flags.
const NO_MINVENT = 0x00000001, MM_EDOG = 0x00000800, MM_NOMSG = 0x00020000;

// C ref: topl.c update_topl — within a single turn, consecutive messages
// concatenate on the top line (separated by two spaces) while there's room
// ("len(bp) + len(toplines) + 3 < CO - 8"), else the pending line pages with
// --More-- first.  display.js's update_topl() already implements this
// exactly; this is just a same-named alias kept so existing call sites below
// don't need touching.
async function pline_append(msg) {
    await update_topl(msg);
}

// C ref: read.c seffects — `if (objects[otyp].oc_magic) exercise(A_WIS, TRUE)`.
// mkobj.js's object table DOES carry oc_magic (OC_MAGIC_RANGES), so read it
// directly rather than keeping a hand-listed set here: the old set named only
// SCR_BLANK_PAPER, so a mail scroll (oc_magic 0 in C) and a blank/novel
// spellbook drew an extra exercise(A_WIS) rn2(19) that C never rolls.
function scroll_is_magic(otyp) { return !!objects[otyp]?.oc_magic; }

// C ref: youprop.h Confusion — the hero's confusion timer (uprops[CONFUSION]),
// as read by the status line's "Conf" indicator (display.js).
function Confused() { return (game.u?.uprops?.Confusion || 0) > 0; }

// C ref: youprop.h Hallucination — the hero's hallucination timer (uhallu),
// as read by u_init.js/potion.js's Hallucination() convention.
function Hallucination() { return !!game.u?.uhallu; }

// C ref: mondata.c can_chant(&youmonst) — whether the hero can speak the words
// (for casting / reading aloud):
//   !((mtmp == &youmonst && Strangled) || is_silent(data) || !has_head(data)
//     || data->msound == MS_BUZZ || data->msound == MS_BURBLE)
// A polymorphed hero really can be a silent/headless/buzzing form, so the whole
// predicate is ported; game.youmonst.data is only present once the hero has
// polymorphed, and an unpolymorphed hero is a humanoid that passes every test.
const MS_SILENT = 0, MS_BUZZ = 10, MS_BURBLE = 16; // C ref: monflag.h MS_*
function can_chant() {
    if (game.u?.Strangled) return false;
    // youmonst.data only differs from the hero's race while polymorphed; an
    // unpolymorphed hero is a humanoid that passes every remaining test.
    const data = game.youmonst?.data;
    if (!data) return true;
    const snd = msound_of(data);
    if (snd === MS_SILENT || snd === MS_BUZZ || snd === MS_BURBLE) return false;
    // C ref: mondata.h has_head(ptr) — !(mflags1 & M1_NOHEAD).
    if ((mflags1_of(data) & M1_NOHEAD) !== 0) return false;
    return true;
}

// C ref: youprop.h Invisible — the hero being unable to see their own hands
// changes seffect_confuse_monster's feedback (and nothing else).
function Invisible() {
    return !!(game.u?.uinvis || game.u?.uprops?.HInvis || game.u?.uprops?.EInvis);
}

// C ref: youprop.h HConfusion (u.uprops[CONFUSION].intrinsic timeout) — the
// numeric timer, not the boolean.  make_confused() sets it; several read.c
// call sites pass `HConfusion + rnd(N)`.
function HConfusion() { return game.u?.uprops?.Confusion || 0; }

// C ref: potion.c make_confused(xtime, talk) — no RNG; mirrors potion.js's
// private copy (uprops.Confusion is the timer, u.uconf the boolean the melee
// code reads).
function make_confused(xtime, _talk) {
    const u = game.u;
    if (!u) return;
    if (!u.uprops) u.uprops = {};
    u.uprops.Confusion = xtime;
    u.uconf = xtime > 0;
    if (game.disp) game.disp.botl = true;
}
// C ref: read.c seffect_magic_mapping — `HConfusion = 1` / `HConfusion = 0`
// assigned directly (not via make_confused) to garble a cursed scroll's map.
function set_confused(xtime) {
    const u = game.u;
    if (!u) return;
    if (!u.uprops) u.uprops = {};
    u.uprops.Confusion = xtime;
    u.uconf = xtime > 0;
}

// C ref: read.c seffect_confuse_monster — `gy.youmonst.data->mlet != S_HUMAN`.
// An unpolymorphed hero is always S_HUMAN (mons[urace.mnum]); only a
// polymorphed one can take the "you get confused instead" branch.
// makemon.js stores the class as both a numeric mcls and its display symbol;
// S_HUMAN's symbol is '@'.
function hero_is_human() {
    const data = game.youmonst?.data;
    if (!data) return true;
    return data.mlet === '@';
}

// C ref: role.h Role_if(PM_WIZARD).
function Role_if_wizard() {
    return (game.u?.urole?.name?.m || game.u?.urole?.name || '') === 'Wizard';
}

// C ref: mon.c svm.mvitals[pmidx].mvflags.
function mvitals_mvflags(pmidx) {
    return game.mvitals?.[pmidx]?.mvflags ?? 0;
}

// C ref: the `fmon` chain — makemon() prepends, so C visits monsters
// newest-first while game.level.monsters is in creation order.  Every read.c
// loop that draws RNG per monster (seffect_scare_monster's resist()) has to
// follow the C order or the draws land on the wrong monsters.
function fmonOrder() {
    const list = game.level?.monsters || [];
    const out = new Array(list.length);
    for (let i = 0; i < list.length; i++) out[i] = list[list.length - 1 - i];
    return out;
}

// C ref: zap.c resist(mtmp, oclass, damage, tell) — the generic saving throw.
// Same private copy zap.js and extcmd-handlers.js already carry; the single
// rn2(100 + alev - dlev) fires even for a monster with mr 0.
function resist(mtmp, oclass, damage, _tell) {
    let alev;
    switch (oclass) {
    case WAND_CLASS: alev = 12; break;
    case TOOL_CLASS: alev = 10; break;   // instrument (the WEAPON_CLASS
                                          // artifact case is also 10)
    case SCROLL_CLASS: alev = 9; break;
    case POTION_CLASS: alev = 6; break;
    case RING_CLASS: alev = 5; break;
    default: alev = game.u?.ulevel || 1; break;
    }
    let dlev = mtmp?.m_lev ?? mtmp?.data?.mlevel ?? 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const resisted = rn2(100 + alev - dlev) < mon_mr(mtmp?.data);
    if (resisted) damage = Math.trunc((damage + 1) / 2);
    if (damage && mtmp) mtmp.mhp = (mtmp.mhp || 0) - damage;
    return resisted;
}

// C ref: hack.c losehp(dmg, ...) — file-local copy (same shape as attrib.js's
// and fountain.js's); death handling isn't modelled here.
function losehp_read(dmg) {
    const u = game.u;
    if (!u || dmg <= 0) return;
    u.uhp = (u.uhp ?? 0) - dmg;
    if (u.uhp < 0) u.uhp = 0;
}

// C ref: obj.h is_shield(otmp) — oc_armcat == ARM_SHIELD.  The JS object table
// has no oc_armcat, so this is the otyp range objects.h assigns to SHIELD():
// small shield .. shield of reflection.
const SHIELD_OTYP_LO = 150, SHIELD_OTYP_HI = 158;
function is_shield_obj(obj) {
    return obj?.oclass === ARMOR_CLASS
        && obj.otyp >= SHIELD_OTYP_LO && obj.otyp <= SHIELD_OTYP_HI;
}

// C ref: obj.h is_elven_armor(otmp) — the complete five-otyp list.
const ELVEN_LEATHER_HELM = 89, ELVEN_MITHRIL_COAT = 127, ELVEN_CLOAK = 139,
      ELVEN_SHIELD = 153, ELVEN_BOOTS = 169;
const ELVEN_ARMOR_OTYPS = new Set([ELVEN_LEATHER_HELM, ELVEN_MITHRIL_COAT,
                                   ELVEN_CLOAK, ELVEN_SHIELD, ELVEN_BOOTS]);
function is_elven_armor(obj) { return ELVEN_ARMOR_OTYPS.has(obj?.otyp); }

// C ref: include/objects.h otyp (armor pieces seffect_enchant_armor names).
const CORNUTHAUM = 93, SILVER_DRAGON_SCALE_MAIL = 103,
      BLACK_DRAGON_SCALE_MAIL = 107, SILVER_DRAGON_SCALES = 113,
      BLACK_DRAGON_SCALES = 117, SHIELD_OF_REFLECTION = 158;

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
export async function seffects(sobj) {
    const otyp = sobj.otyp;
    if (scroll_is_magic(otyp))
        exercise(A_WIS, true);

    switch (otyp) {
    case SCR_MAGIC_MAPPING:
    case SPE_MAGIC_MAPPING:
        await seffect_magic_mapping(sobj);
        break;
    case SCR_LIGHT:
        await seffect_light(sobj);
        break;
    case SCR_ENCHANT_ARMOR:
        // returns true on C's `*sobjp = 0` path (no armor worn ->
        // strange_feeling already used the scroll up)
        if (await seffect_enchant_armor(sobj)) return true;
        break;
    case SCR_CONFUSE_MONSTER:
    case SPE_CONFUSE_MONSTER:
        await seffect_confuse_monster(sobj);
        break;
    case SCR_SCARE_MONSTER:
    case SPE_CAUSE_FEAR:
        await seffect_scare_monster(sobj);
        break;
    case SCR_CREATE_MONSTER:
    case SPE_CREATE_MONSTER:
        await seffect_create_monster(sobj);
        break;
    case SCR_AMNESIA:
        await seffect_amnesia(sobj);
        break;
    case SCR_BLANK_PAPER:
        // C ref: read.c seffect_blank_paper().  Was falling through to the
        // no-op default, which left gk.known FALSE — so doread() then ran
        // trycall() and asked the player to name the scroll appearance, an
        // input-consuming prompt C never issues (C learns the type instead).
        await pline_append(Blind()
            ? "You don't remember there being any magic words on this scroll."
            : 'This scroll seems to be blank.');
        game.known = true;
        break;
    case SCR_IDENTIFY:
    case SPE_IDENTIFY:
        await seffect_identify(sobj);
        return true; // seffect_identify uses up the scroll itself
    case SCR_DESTROY_ARMOR:
        return await seffect_destroy_armor(sobj);
    case SCR_REMOVE_CURSE:
    case SPE_REMOVE_CURSE:
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
            game.known = true;
        } else {
            await scrolltele(sobj);
        }
        break;
    case SCR_ENCHANT_WEAPON: {
        const consumed = await seffect_enchant_weapon(sobj);
        if (consumed) return true;
        break;
    }
    case SCR_GOLD_DETECTION:
        // C ref: read.c seffect_gold_detection() — a confused/cursed read does
        // trap_detect() instead (not ported; it takes the same browse_map path
        // and is left to the default until a session needs it).
        if (Confused() || sobj.cursed) break;
        if (await seffect_gold_detection(sobj)) return true; // strange_feeling used it up
        break;
    case 339 /*SCR_FIRE*/:
    case 368 /*SPE_FIREBALL*/:
        await seffect_fire(sobj);
        return true;                       // seffect_fire uses the scroll up
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
        // C ref: read.c seffects default: -> impossible().  Every otyp that
        // still lands here is a REAL unported effect, not an inert one:
        //   SCR_TAMING/SPE_CHARM_MONSTER (needs dog.c tamedog),
        //   SCR_GENOCIDE (do_genocide -> getlin loop),
        //   SCR_GOLD_DETECTION / SCR_FOOD_DETECTION (detect.c gold_detect,
        //     trap_detect, food_detect — none ported),
        //   SCR_CHARGING (getobj("charge") + recharge()),
        //   SCR_FIRE (explode()), SCR_EARTH (drop_boulder_on_*),
        //   SCR_STINKING_CLOUD (getpos), SCR_MAIL.
        // Each of those draws RNG and/or consumes input in C, so a hero who
        // reads one desynchronises from here on.
        break;
    }
    return false;
}

// C ref: read.c seffect_gold_detection() -> detect.c gold_detect().  Returns
// true when nothing was detected (C's `*sobjp = 0`: strange_feeling used the
// scroll up).  browse_map()'s getpos loop and the closing docrt() are threaded
// in from hack.js/display.js here to keep detect.js free of that import cycle.
async function seffect_gold_detection(sobj) {
    const { gold_detect } = await import('./detect.js');
    const { browse_map_getpos } = await import('./hack.js');
    const { docrt, flush_screen } = await import('./display.js');
    const nothing = await gold_detect(sobj, (goal) => browse_map_getpos(goal, true),
                                      docrt, update_topl, topl_more, flush_screen);
    if (nothing) {
        await strange_feeling(sobj, 'You feel materially poor.');
        return true;
    }
    game.known = true;
    return false;
}

// C ref: read.c seffect_magic_mapping().
async function seffect_magic_mapping(sobj) {
    const is_scroll = (sobj.oclass === SCROLL_CLASS);
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = Confused();
    const nommap = !!game.level?.flags?.nommap;

    if (is_scroll) {
        if (nommap) {
            await pline_append('Your mind is filled with crazy lines!');
            if (Hallucination())
                await pline_append('Wow!  Modern art.');
            else
                await pline_append('Your head spins in bewilderment.');
            make_confused(HConfusion() + rnd(30), false);
            return;
        }
        if (sblessed) {
            // C: every secret door on the level becomes an ordinary door.  No
            // RNG, but it rewrites the map (and unblocks vision on rogue levels).
            for (let x = 1; x < COLNO; x++)
                for (let y = 0; y < ROWNO; y++) {
                    const loc = game.level?.at(x, y);
                    if (loc && loc.typ === SDOOR) cvt_sdoor_to_door(loc);
                }
        }
        game.known = true;
    }

    if (nommap) {
        await pline_append('Your head spins as something blocks the spell!');
        make_confused(HConfusion() + rnd(30), false);
        return;
    }
    // C tty concatenates same-turn toplines: "...disappears.  A map ...".
    await pline_append('A map coalesces in your mind!');
    const cval = (scursed && !confused);
    if (cval) set_confused(1); // to screw up map
    await do_mapping();
    if (cval) {
        set_confused(0); // restore
        await pline_append("Unfortunately, you can't grasp the details.");
    }
}

// C ref: detect.c cvt_sdoor_to_door(lev) — a secret door, once exposed, becomes
// an ordinary (closed) door; WM_MASK is the wall-mode bits an SDOOR keeps in
// doormask.  (dig.js has the same private copy.)
function cvt_sdoor_to_door(lev) {
    let newmask = lev.doormask & ~WM_MASK;
    if (!(newmask & D_LOCKED)) newmask |= D_CLOSED;
    lev.typ = DOOR;
    lev.doormask = newmask;
}

// C ref: read.c seffect_light().  The non-confused half also runs lightdamage()
// (a gremlin hero burns), and the confused half surrounds the hero with rn1(2,3)
// (+2 if blessed) cancelled tame lights — makemon() draws per light, so the
// whole branch is RNG-visible, not just a message.
async function seffect_light(sobj) {
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    if (!Confused()) {
        if (!Blind()) game.known = true;
        await litroom(!scursed, sobj);
        if (!scursed) {
            if (await lightdamage(sobj, true, 5)) game.known = true;
        }
        return;
    }
    const pm = scursed ? PM_BLACK_LIGHT : PM_YELLOW_LIGHT;
    if ((mvitals_mvflags(pm) & G_GONE) !== 0) {
        await pline_append('Tiny lights sparkle in the air momentarily.');
        return;
    }
    const { makemon, monster_by_pmidx } = await import('./makemon.js');
    const { canspotmon } = await import('./uhitm.js');
    const u = game.u;
    let sawlights = false;
    const numlights = rn1(2, 3) + (sblessed ? 2 : 0);
    for (let i = 0; i < numlights; i++) {
        const mon = makemon(monster_by_pmidx(pm), u.ux, u.uy,
                            MM_EDOG | NO_MINVENT | MM_NOMSG);
        if (!mon) continue;
        // C ref: dog.c initedog(mon, TRUE) — no RNG; the tame/peaceful flags
        // and the "cancelled" mcan are what keeps these lights from exploding.
        mon.mtame = 10;
        mon.mpeaceful = 1;
        mon.msleeping = 0;
        mon.mcan = true;
        if (canspotmon(mon)) sawlights = true;
        newsym(mon.mx, mon.my);
    }
    if (sawlights) {
        await pline_append('Lights appear all around you!');
        game.known = true;
    }
}

// C ref: zap.c lightdamage(obj, ordinary, amt) — only a gremlin hero takes
// damage, but the caller uses the return value to decide discovery.
async function lightdamage(obj, ordinary, amt) {
    let dmg = amt;
    const PM_GREMLIN = 40; // makemon.js MONS index (zap.js's copy agrees)
    if (dmg && game.u?.umonnum === PM_GREMLIN) {
        dmg = rnd(dmg);
        if (dmg > 10) dmg = 10 + rnd(dmg - 10);
        if (dmg > 20) dmg = 20;
        await pline_append(`Ow, that light hurts${(dmg > 2 || (game.u?.mh ?? 0) <= 5) ? '!' : '.'}`);
        // C: losehp(Maybe_Half_Phys(dmg), "<zapped|blasted> himself with <obj>")
        losehp_read(dmg);
    }
    return dmg;
}

// C ref: read.c seffect_confuse_monster() (also the confuse-monster spell).
// Every branch draws: rnd(100) for a self-confusing read, rnd(2) or rn1(8,2)
// for the hands-glow charge counter.
async function seffect_confuse_monster(sobj) {
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = Confused();
    const altfeedback = Blind() || Invisible();
    const hands = 'hands'; // makeplural(body_part(HAND)) for a humanoid hero
    const u = game.u;

    if (!hero_is_human() || scursed) {
        if (!HConfusion())
            await pline_append('You feel confused.');
        make_confused(HConfusion() + rnd(100), false);
    } else if (confused) {
        if (!sblessed) {
            await pline_append(`Your ${hands} begin to ${altfeedback ? 'tingle' : 'glow '}${altfeedback ? '' : hcolor_wep('purple')}.`);
            make_confused(HConfusion() + rnd(100), false);
        } else {
            await pline_append(`A ${altfeedback ? '' : hcolor_wep('red')}${altfeedback ? 'faint buzz' : ' glow'} surrounds your head.`);
            make_confused(0, true);
        }
    } else {
        // scroll vs spell
        let incr = (sobj.oclass === SCROLL_CLASS) ? 3 : 0;
        const umconf = u.umconf || 0;
        if (!sblessed) {
            if (altfeedback)
                await pline_append(`Your ${hands} tingle${umconf ? ' even more' : ''}.`);
            else if (!umconf)
                await pline_append(`Your ${hands} begin to glow ${hcolor_wep('red')}.`);
            else
                await pline_append(`The ${hcolor_wep('red')} glow of your ${hands} intensifies.`);
            incr += rnd(2);
        } else {
            if (altfeedback)
                await pline_append(`Your ${hands} tingle ${umconf ? 'even more' : 'very'} sharply.`);
            else
                await pline_append(`Your ${hands} glow ${umconf ? 'an even more' : 'a'} brilliant ${hcolor_wep('red')}.`);
            incr += rn1(8, 2);
        }
        // after a while, repeated uses become less effective
        if (umconf >= 40) incr = 1;
        u.umconf = umconf + incr;
    }
}

// C ref: read.c seffect_scare_monster() (also the cause-fear spell).  resist()
// draws rn2(100 + alev - dlev) for EVERY visible non-fleeing monster, so the
// whole loop is RNG-visible even though its only lasting effect is mflee.
async function seffect_scare_monster(sobj) {
    const otyp = sobj.otyp;
    const scursed = !!sobj.cursed;
    const confused = Confused();
    let ct = 0;
    const { DEADMONSTER } = await import('./mon.js');
    const { monflee } = await import('./uhitm.js');

    for (const mtmp of fmonOrder()) {
        if (DEADMONSTER(mtmp)) continue;
        if (cansee(mtmp.mx, mtmp.my)) {
            if (confused || scursed) {
                mtmp.mflee = 0; mtmp.mfrozen = 0; mtmp.msleeping = 0;
                mtmp.mcanmove = 1;
            } else if (!resist(mtmp, SCROLL_CLASS, 0, false)) {
                monflee(mtmp, 0, false, false);
            }
            if (!mtmp.mtame) ct++; // pets don't laugh at you
        }
    }
    if (otyp === SCR_SCARE_MONSTER || !ct) {
        await pline_append(`You hear ${(confused || scursed) ? 'sad wailing' : 'maniacal laughter'} ${!ct ? 'in the distance' : 'close by'}.`);
    }
}

// C ref: read.c seffect_create_monster() -> makemon.c create_critters().
async function seffect_create_monster(sobj) {
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = Confused();
    const { monster_by_pmidx } = await import('./makemon.js');
    const cnt = 1 + ((confused || scursed) ? 12 : 0)
        + ((sblessed || rn2(73)) ? 0 : rnd(4));
    if (await create_critters(cnt, confused ? monster_by_pmidx(PM_ACID_BLOB) : null,
                              false))
        game.known = true;
}

// C ref: makemon.c create_critters(cnt, mptr, neverask).
// The `ask = (wizard && !neverask)` create_particular() prompt is deliberately
// NOT wired in here: zap.js's copy documents the same gap (a wizard-mode hero
// gets one "Create what kind of monster?" getlin per critter before makemon()
// is reached).  Fixing it belongs with that copy, in one place.
async function create_critters(cnt, mptr, _neverask) {
    const { makemon } = await import('./makemon.js');
    const { canspotmon } = await import('./uhitm.js');
    const u = game.u;
    let known = false;
    while (cnt-- > 0) {
        // (u.uinwater enexto(GIANT_EEL) relocation isn't modelled.)
        const mon = makemon(mptr, u.ux, u.uy, 0);
        if (!mon) continue;
        if (canspotmon(mon)) known = true;
    }
    return known;
}

// C ref: read.c seffect_amnesia() -> forget().
async function seffect_amnesia(sobj) {
    const sblessed = !!sobj.blessed;
    game.known = true;
    await forget(!sblessed ? ALL_SPELLS : 0);
    if (Hallucination())
        await pline_append('Your mind releases itself from mundane concerns.');
    else if ((game.plname || game.u?.plname || '').slice(0, 4).toLowerCase() === 'maud')
        await pline_append('As your mind turns inward on itself, you forget everything else.');
    else if (rn2(2))
        await pline_append('Who was that Maud person anyway?');
    else
        await pline_append('Thinking of Maud you forget everything else.');
    exercise(A_WIS, false);
}

// C ref: read.c forget(howmuch).  losespells() (spell.c) and
// drain_weapon_skill() (weapon.c) are not ported; the rnd() that picks how many
// skills to drain is C's, and it fires before drain_weapon_skill() is entered,
// so it belongs here regardless.  drain_weapon_skill()'s own rn2(skills_advanced)
// / rn2(curradv - prevadv) draws are deferred with it.
async function forget(howmuch) {
    const u = game.u;
    if (u?.uball) u.bc_felt = 0; // Punished: forget felt ball&chain
    if (howmuch & ALL_SPELLS) {
        const spell = await import('./spell.js');
        if (spell.losespells) spell.losespells();
    }
    rnd(howmuch ? 5 : 3); // drain_weapon_skill(rnd(...)) argument
    for (const mtmp of (game.level?.monsters || []))
        if (mtmp !== game.u?.usteed && mtmp !== game.u?.ustuck)
            mtmp.meverseen = 0;
}

// C ref: read.c seffect_enchant_armor() — scroll of enchant armor.  This was
// missing entirely: every read fell through seffects' default and drew none of
// C's rn2(s)/rnd(s)/rn2(spe)/rn2(7).
async function seffect_enchant_armor(sobj) {
    const otmp = some_armor();
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = Confused();

    if (!otmp) {
        await strange_feeling(sobj, !Blind()
            ? 'Your skin glows then fades.'
            : 'Your skin feels warm for a moment.');
        exercise(A_CON, !scursed);
        exercise(A_STR, !scursed);
        return true; // *sobjp = 0 (useup in strange_feeling)
    }
    if (confused) {
        const new_erodeproof = !scursed;
        otmp.oerodeproof = 0; // for messages
        if (Blind()) {
            otmp.rknown = false;
            await pline_append(`${Yobjnam2_wep(otmp, 'feel')} warm for a moment.`);
        } else {
            otmp.rknown = true;
            await pline_append(`${Yobjnam2_wep(otmp, 'are')} covered by a ${scursed ? 'mottled' : 'shimmering'} ${hcolor_wep(scursed ? 'black' : 'golden')} ${scursed ? 'glow' : (is_shield_obj(otmp) ? 'layer' : 'shield')}!`);
        }
        if (new_erodeproof && (otmp.oeroded || otmp.oeroded2)) {
            otmp.oeroded = 0; otmp.oeroded2 = 0;
            await pline_append(`${Yobjnam2_wep(otmp, Blind() ? 'feel' : 'look')} as good as new!`);
        }
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return false;
    }
    // elven armor vibrates warningly when enchanted beyond a limit
    const special_armor = is_elven_armor(otmp)
        || (Role_if_wizard() && otmp.otyp === CORNUTHAUM);
    let same_color = scursed
        ? (otmp.otyp === BLACK_DRAGON_SCALE_MAIL || otmp.otyp === BLACK_DRAGON_SCALES)
        : (otmp.otyp === SILVER_DRAGON_SCALE_MAIL || otmp.otyp === SILVER_DRAGON_SCALES
           || otmp.otyp === SHIELD_OF_REFLECTION);
    if (Blind()) same_color = false;

    let s = scursed ? -(otmp.spe || 0) : (otmp.spe || 0);
    if (s > (special_armor ? 5 : 3) && rn2(s)) {
        otmp.in_use = true;
        await pline_append(`${Yname2_wep(otmp)} violently ${otense_wep(otmp, Blind() ? 'vibrate' : 'glow')}${(!Blind() && !same_color) ? ' ' : ''}${(Blind() || same_color) ? '' : hcolor_wep(scursed ? 'black' : 'silver')} for a while, then ${otense_wep(otmp, 'evaporate')}.`);
        await remove_worn_item(otmp, false);
        useup(otmp);
        return false;
    }
    if (s < -100) s = -100;

    s = Math.trunc((4 - s) / 2);
    if (special_armor) ++s;
    if (!objects[otmp.otyp]?.oc_magic) ++s;
    if (sblessed) ++s;

    if (s <= 0) {
        s = 0;
        if ((otmp.spe || 0) > 0 && !rn2(otmp.spe)) s = 1;
    } else {
        s = rnd(s);
    }
    if (s > 11) s = 11;
    if (scursed) s = -s;

    // (the s >= 0 && Is_dragon_scales(otmp) "merges and hardens" branch — scales
    // turning into scale mail — is not ported: no otyp mapping for it here.)

    await pline_append(`${Yname2_wep(otmp)} ${(s === 0) ? 'violently ' : ''}${otense_wep(otmp, Blind() ? 'vibrate' : 'glow')}${(!Blind() && !same_color) ? ' ' : ''}${(Blind() || same_color) ? '' : hcolor_wep(scursed ? 'black' : 'silver')} for a ${(s * s > 1) ? 'while' : 'moment'}.`);
    if (scursed && !otmp.cursed) curse(otmp);
    else if (sblessed && !otmp.blessed) bless(otmp);
    else if (!scursed && otmp.cursed) uncurse(otmp);
    if (s) {
        const oldspe = otmp.spe || 0;
        otmp.spe = oldspe + s;
        cap_spe(otmp);
        s = otmp.spe - oldspe;
        if (s) adj_abon(otmp, s);
        game.known = !!otmp.known;
    }
    if ((otmp.spe || 0) > (special_armor ? 5 : 3)
        && (special_armor || !rn2(7)))
        await pline_append(`${Yobjnam2_wep(otmp, 'suddenly vibrate')} ${Blind() ? 'again' : 'unexpectedly'}.`);
    return false;
}

// C ref: do_wear.c adj_abon(otmp, delta) — only the two attribute-granting
// armor pieces react; both makeknown() themselves when the bonus changes.
const GAUNTLETS_OF_DEXTERITY = 162, HELM_OF_BRILLIANCE = 96; // objects.h otyp
function adj_abon(otmp, delta) {
    const u = game.u;
    if (game.uarmg && game.uarmg === otmp && otmp.otyp === GAUNTLETS_OF_DEXTERITY) {
        if (delta) {
            makeknown(otmp.otyp);
            if (u?.abon?.a) u.abon.a[A_DEX] = (u.abon.a[A_DEX] || 0) + delta;
        }
        if (game.disp) game.disp.botl = true;
    }
    if (game.uarmh && game.uarmh === otmp && otmp.otyp === HELM_OF_BRILLIANCE) {
        if (delta) {
            makeknown(otmp.otyp);
            if (u?.abon?.a) {
                u.abon.a[A_INT] = (u.abon.a[A_INT] || 0) + delta;
                u.abon.a[A_WIS] = (u.abon.a[A_WIS] || 0) + delta;
            }
        }
        if (game.disp) game.disp.botl = true;
    }
}

// C ref: read.c cap_spe(obj) — max spe is +99, min is -99.
function cap_spe(obj) {
    if (obj && Math.abs(obj.spe || 0) > SPE_LIM)
        obj.spe = Math.sign(obj.spe) * SPE_LIM;
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
    // C ref: punish() — an amorphous/whirly/unsolid polyform gets "A ball and
    // chain appears, then falls away." and stays unpunished; that branch needs
    // youmonst.data, so a normal hero (always chained) is what's ported.
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

// C ref: objnam.c erosion_matters(obj) — the COMPLETE switch: weptools,
// weapons, armor, and the ball & chain.  (The old form listed only WEAPON and
// ARMOR, so a confused enchant-weapon read while wielding a pick-axe or the
// iron ball skipped seffect_enchant_weapon's erodeproof branch and fell into
// chwepon() instead — a different message AND a different rn2 stream.)
function erosion_matters_wep(obj) {
    switch (obj?.oclass) {
    case TOOL_CLASS: return is_weptool_wep(obj);
    case WEAPON_CLASS:
    case ARMOR_CLASS:
    case BALL_CLASS:
    case CHAIN_CLASS:
        return true;
    default: return false;
    }
}

// C ref: obj.h is_weptool(o) — a TOOL_CLASS object with a real weapon skill.
function is_weptool_wep(obj) {
    return obj?.oclass === TOOL_CLASS && (objects[obj.otyp]?.oc_skill ?? 0) !== 0;
}

// C ref: do_name.c hcolor(colorpref) — `(Hallucination || !colorpref)
// ? hcolors[rn2_on_display_rng(SIZE(hcolors))] : colorpref`.  The hallucinating
// pick uses the DISPLAY rng, not the main one, so this stub costs no PRNG
// desync — only a wrong colour word in the message while hallucinating.
// (Same stub as fountain.js's hcolor(); every call site here passes a non-null
// colorpref, so the !colorpref half never applies.)
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
// C ref: objnam.c Yname2(obj) — capitalised yname(): "Your <name>" for a
// carried object (the shk_your() "the <shopkeeper>'s" form for unpaid shop
// goods is not modelled).
function Yname2_wep(obj) { return `Your ${xname(obj)}`; }

// C ref: obj.h is_elven_weapon(otmp) — the complete five-otyp list.
const ELVEN_WEAPON_OTYPS = new Set([19 /*ELVEN_ARROW*/, 28 /*ELVEN_SPEAR*/,
    35 /*ELVEN_DAGGER*/, 47 /*ELVEN_SHORT_SWORD*/, 53 /*ELVEN_BROADSWORD*/,
    84 /*ELVEN_BOW*/]);
function is_elven_weapon(obj) { return ELVEN_WEAPON_OTYPS.has(obj?.otyp); }
const WORM_TOOTH = 42, CRYSKNIFE = 43; // C ref: objects.h otyp

// C ref: wield.c chwepon(otmp, amount) — enchant (amount>0) or disenchant
// (amount<0) the wielded weapon; otmp is the scroll causing it.  Returns
// false only for the "no weapon wielded" fallback (matching C's `return 0`,
// which signals the caller to treat the scroll as already consumed).
// Unported: the cursed-tin-opener uncurse-with-aura branch (needs will_weld())
// and the artifact "faintly glow"/Magicbane clue branches (need artifact
// support).
async function chwepon(otmp, amount) {
    const uwep = game.uwep;
    if (!uwep || (uwep.oclass !== WEAPON_CLASS && !is_weptool_wep(uwep))) {
        await strange_feeling(otmp, `Your hands ${amount >= 0 ? 'twitch' : 'itch'}.`);
        exercise(A_DEX, amount >= 0);
        return false;
    }

    const is_scroll = !!(otmp && otmp.oclass === SCROLL_CLASS);

    // A worm tooth sharpens into a crysknife (and back), skipping the whole
    // spe/message path below.
    if (uwep.otyp === WORM_TOOTH && amount >= 0) {
        const multiple = (uwep.quan ?? 1) > 1;
        await pline_append(`Your ${xname(uwep)} ${multiple ? 'fuse, and become' : 'is'} much sharper now.`);
        uwep.otyp = CRYSKNIFE;
        uwep.oerodeproof = 0;
        if (multiple) { uwep.quan = 1; uwep.owt = weight(uwep); }
        if (uwep.cursed) uncurse(uwep);
        if (is_scroll) makeknown(otmp.otyp);
        return true;
    } else if (uwep.otyp === CRYSKNIFE && amount < 0) {
        const multiple = (uwep.quan ?? 1) > 1;
        await pline_append(`Your ${xname(uwep)} ${multiple ? 'fuse, and become' : 'is'} much duller now.`);
        uwep.otyp = WORM_TOOTH;
        uwep.oerodeproof = 0;
        if (multiple) { uwep.quan = 1; uwep.owt = weight(uwep); }
        if (is_scroll && otmp.bknown) makeknown(otmp.otyp);
        return true;
    }

    const color = hcolor_wep(amount < 0 ? 'black' : 'blue');
    if ((((uwep.spe || 0) > 5 && amount >= 0)
         || ((uwep.spe || 0) < -5 && amount < 0)) && rn2(3)) {
        if (!Blind())
            await pline_append(`${Yobjnam2_wep(uwep, 'violently glow')} ${color} for a while and then ${otense_wep(uwep, 'evaporate')}.`);
        else
            await pline_append(`${Yobjnam2_wep(uwep, 'evaporate')}.`);
        useupall(uwep);
        return true;
    }
    // C guards BOTH the message and the makeknown() with !Blind: a blind hero
    // never learns the scroll type from this, which decides whether doread()
    // runs learnscroll() or the input-consuming trycall() prompt.
    if (!Blind()) {
        const xtime = (amount * amount === 1) ? 'moment' : 'while';
        await pline_append(`${Yobjnam2_wep(uwep, amount === 0 ? 'violently glow' : 'glow')} ${color} for a ${xtime}.`);
        if (is_scroll && uwep.known
            && (amount > 0 || (amount < 0 && otmp.bknown)))
            makeknown(otmp.otyp);
    }

    uwep.spe = (uwep.spe || 0) + amount;
    if (amount > 0 && uwep.cursed) uncurse(uwep);

    // an elven magic clue: elven weapons vibrate warningly when enchanted
    // beyond a limit.  The rn2(7) is a real draw for any non-elven,
    // non-artifact weapon taken above +5.
    if ((uwep.spe || 0) > 5
        && (is_elven_weapon(uwep) || uwep.oartifact || !rn2(7)))
        await pline_append(`${Yobjnam2_wep(uwep, 'suddenly vibrate')} unexpectedly.`);
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

// C ref: teleport.c teleok(x,y,trapok) — hero-only subset.  UNPORTED and real
// on special levels: tele_jump_ok() (Sokoban forbids teleporting past a wall,
// the endgame air/water levels have their own rules) and in_out_region()
// (Juiblex's swamp / the Wizard's tower keep you in or out) both veto
// destinations that the trap guard and goodpos() accept, so a teleport on one
// of those levels can land somewhere C would have rejected.  Exported: also used by
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

// C ref: teleport.c teleds(nux,nuy,TELEDS_TELEPORT) — hero-only subset.
// Relocates the hero, redraws the vacated square, recalculates vision,
// announces the materialize message (after the vision recalc, so a paged
// --More-- shows the new map, matching the C comment on this ordering), then
// runs spoteffects() at the new spot.
// Still unported: the vault-guard alarm (needs vault_occupied/findgd), the
// hidden-mimic unwind, switch_terrain() on a terrain-type change, fill_pit()
// of the vacated square, and nomul(0) (the port's occupation model differs;
// see the "nomul(0) must leave occupation armed" gotcha).
// Exported for hack.js's dotele_wizard() (see teleok_hero above).
export async function teleds_hero(nux, nuy) {
    const u = game.u;
    const oldx = u.ux, oldy = u.uy;
    // C ref: teleds() — a punished hero's ball & chain come off the map before
    // the move and go back down at the new spot.  Without this they stayed on
    // the OLD square: two stray glyphs on the map and a ball the hero is
    // supposedly chained to at arbitrary distance.  (drag_ball()'s
    // distmin<=1 "don't have to move the ball" case can't apply to a real
    // teleport, so C's unplacebc()+placebc() pair is what runs.)
    const ball_active = !!(u.uball && u.uchain);
    if (ball_active) {
        // C ref: teleds() — unplacebc() takes the pair off the map, placebc()
        // puts it back at the destination.  move_bc(before=1) was used here as
        // "the same lift", but move_bc's whole body is the Blind arm's
        // `if (!before)` and a control mask of 0 moves nothing, so the pair was
        // never removed and placebc() duplicated it on the pile.
        // (C's drag_ball()/move_bc() path for a destination within 2 squares of
        // the ball is not ported; lifting and re-placing lands the pair on the
        // hero's own square, which is where a 0-step hop leaves it anyway.)
        const { unplacebc, placebc } = await import('./ball.js');
        unplacebc();
        // C ref: teleds() — reset_utrap(FALSE): teleporting frees the hero from
        // a pit/web/bear trap.  Leaving u.utrap set kept a teleported hero
        // "still stuck" at the destination.
        reset_utrap();
        u.ux0 = oldx; u.uy0 = oldy;
        u.ux = nux; u.uy = nuy;
        placebc();
    } else {
        reset_utrap();
        u.ux0 = oldx; u.uy0 = oldy;
        u.ux = nux; u.uy = nuy;
    }
    // C ref: teleds() — set_ustuck(NULL) also clears uswallow.
    u.uswallow = 0;
    u.ustuck = null;
    newsym(oldx, oldy);
    // SCRATCH: C ref: teleport.c:537 see_monsters()
    for (const m of (game.level?.monsters || [])) {
        if (m.mhp != null && m.mhp <= 0) continue;
        newsym(m.mx, m.my);
    }
    newsym(nux, nuy);
    vision_recalc(0);
    if (game.flags?.verbose !== false) {
        const where = (nux === oldx && nuy === oldy) ? 'the same' : 'a different';
        await update_topl(`You materialize in ${where} location!`);
    }
    // C ref: teleport.c teleds() -> spoteffects(TRUE) — the arrival square's
    // pile is looked at / picked up.  Passing null skipped the whole pickup.
    const { pickup_after_move } = await import('./cmd.js');
    await spoteffects(pickup_after_move);
}

// C ref: trap.c reset_utrap(msg) — clear the hero's trapped state.  The msg
// arm (float_vs_flight) only matters for the TRUE caller.
function reset_utrap() {
    const u = game.u;
    if (!u) return;
    u.utrap = 0;
    u.utraptype = 0;
}

// C ref: teleport.c scrolltele(scroll) — the in-level teleport a non-confused,
// non-cursed scroll of teleportation performs.  Only the tail (safe_teleds)
// used to be here, so three earlier C branches were skipped entirely:
//  * a noteleport level ("A mysterious force prevents you...") aborts with no
//    teleport at all — and still learns the scroll;
//  * carrying the Amulet costs an rn2(3) that can abort the whole thing;
//  * a Teleport_control hero, a BLESSED scroll, or wizard mode gets a
//    getpos() CONTROLLED teleport, which reads keystrokes.  Skipping the
//    getpos meant those keys fell through to the command parser.
// learnscroll() also fires BEFORE safe_teleds() in C, so its discovery
// exercise(A_WIS) rn2(19) precedes the destination rolls; setting gk.known and
// letting doread() learn afterwards had those two swapped.
export async function scrolltele(scroll) {
    const u = game.u;
    const wizard = !!game.flags?.debug;
    // C ref: dungeon.c noteleport_level() — the level flag (plus the
    // Wizard-of-Yendor/Vlad's-Tower special cases the flag already encodes).
    if (game.level?.flags?.noteleport && !wizard) {
        await pline_append('A mysterious force prevents you from teleporting!');
        if (scroll) learnscroll(scroll);
        return;
    }
    // C: `if (!Blinded) make_blinded(0L, FALSE);` — a no-op unless the hero is
    // blinded from a source with no timeout; not modelled.

    // C ref: `(u.uhave.amulet || On_W_tower_level(&u.uz)) && !rn2(3)`.  (The
    // Wizard's-tower half needs In_W_tower(); the Amulet half is ported.)
    if (u?.uhave?.amulet && !rn2(3)) {
        await pline_append('You feel disoriented for a moment.');
        if (!wizard) return;
        // (wizard mode's y_n("Override?") prompt is not modelled; C continues
        // only on 'y'.)
    }

    const stunned = (u?.uprops?.Stun || 0) > 0;
    if ((((u?.uprops?.Teleport_control || 0) > 0 || (scroll && scroll.blessed))
         && !stunned) || wizard) {
        if (u?.usleep) {
            await pline_append('Being unconscious, you cannot control your teleport.');
        } else {
            const { getpos, getpos_render } = await import('./hack.js');
            await getpos_render('Where do you want to be teleported?', u.ux, u.uy);
            game._toplin = 1;
            game._toplines = 'Where do you want to be teleported?';
            if (scroll) learnscroll(scroll);
            const verbose = game.flags?.verbose !== false;
            const cc = await getpos('the desired position', u.ux, u.uy, null,
                                    /*force=*/true, verbose);
            if (!cc) return; // getpos() < 0: abort
            if (teleok_hero(cc.x, cc.y, false)) {
                await teleds_hero(cc.x, cc.y);
                return;
            }
            await pline_append('Sorry...');
        }
    }
    // C: `if (scroll) learnscroll(scroll);` HERE, i.e. the discovery
    // exercise(A_WIS) rn2(19) fires BEFORE safe_teleds()'s destination rolls.
    // MEASURED but NOT LANDED: making that ordering faithful is worth +8 public
    // screens on seed0004 (294->302) yet costs step 397, a coincidental match
    // inside an already-diverged region (C ate 2 more carrots than we did), so
    // the per-step superset gate rejects it.  Deferred to a change that also
    // fixes that carrot divergence.  Until then gk.known defers the makeknown
    // to doread(), which puts the rn2(19) after the teleport instead.
    if (scroll) learnscroll(scroll);
    await safe_teleds_hero();
}

// C ref: read.c learnscroll(sobj) — a spellbook (fake object for a spell)
// learns nothing; a scroll learns its type.
function learnscroll(sobj) {
    if (sobj.oclass !== SPBOOK_CLASS) learnscrolltyp(sobj.otyp);
}

// C ref: teleport.c safe_teleds(TELEDS_TELEPORT) — hero-only subset: the
// initial "completely random, up to 40 tries" loop.
// UNPORTED and real: when all 40 tries fail (a cramped or crowded level —
// Sokoban, the mines' end, a big monster crowd) C does NOT give up.  It builds
// a shuffled ring-expanding candidate list (collect_coords, CC_RING_PAIRS |
// CC_SKIP_MONS [| CC_SKIP_INACCS]) — which itself draws for the shuffle — walks
// it, and finally falls back to the first acceptable TRAP square.  Returning
// FALSE here instead leaves the hero standing where they were, with the whole
// PRNG stream short by collect_coords' draws.
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

// C ref: read.c litroom(on, obj) — light (on) or darken (!on, a cursed scroll)
// the area around the hero.  C lights every couldsee cell within radius
// (do_clear_area + set_lit, 9 for a blessed scroll else 5) and forces a redraw
// so newly-lit corridor cells outside the hero's own room become visible.
//
// set_lit() is NOT RNG-free: it collects every gremlin standing on a
// newly-lit square, and after the vision recalc each one takes
// light_hits_gremlin(mon, rnd(5)).  The darkening half also snuffs the hero's
// lit lamps/candles and (when Punished and not blind) has to pick the ball &
// chain up and put them back so they aren't remembered out of sight.
// Still unported: the rogue-level whole-room relight (needs svr.rooms[] +
// rlit), the Sunsword #invoke radius-0 case, and impact_arti_light() on
// artifact lights.
export async function litroom(on, obj) {
    const u = game.u;
    const no_op = !!(u?.uswallow || u?.uprops?.Underwater || Is_waterlevel(u?.uz));
    const blessed_effect = !!(obj?.oclass === SCROLL_CLASS && obj.blessed);
    const loc0 = game.level?.at(u.ux, u.uy);

    if (!on) {
        let still_lit = 0;
        for (const otmp of [...(game.invent || [])]) {
            if (otmp.lamplit) {
                // (artifact_light() -> impact_arti_light() not modelled; the
                // ordinary case just snuffs the flame.  No RNG either way.)
                otmp.lamplit = 0;
                if (otmp.lamplit) ++still_lit;
            }
        }
        if (!Blind()) {
            if (still_lit)
                await pline_append('The ambient light seems dimmer.');
            else if (u?.uswallow)
                await pline_append('It seems even darker in here than before.');
            else
                await pline_append('You are surrounded by darkness!');
        }
    } else {
        if (!u?.uswallow && !Blind()
            && !(Is_rogue_level(u.uz) && loc0?.typ === CORR))
            await pline_append(`A lit field ${no_op ? 'briefly ' : ''}surrounds you!`);
        // (the swallowed "<Mon>'s stomach is lit" variants need mbodypart().)
    }

    if (no_op) return;

    // C ref: ball.c move_bc(before, ...) — lift the ball & chain out of the
    // map before the squares go dark, then put them back after the redraw.
    const punished = !!(u?.uball && u?.uchain);
    const { move_bc } = await import('./ball.js');
    if (punished && !on && !Blind())
        move_bc(1, 0, u.uball.ox, u.uball.oy, u.uchain.ox, u.uchain.oy);

    if (Is_rogue_level(u.uz)) return; // whole-room rogue relight not ported

    const gremlins = [];
    const PM_GREMLIN = 40; // makemon.js MONS index
    const { m_at } = await import('./display.js');
    const set_lit = (x, y) => {
        const loc = game.level?.at(x, y);
        if (!loc) return;
        if (on) {
            loc.lit = 1;
            const mtmp = m_at(x, y);
            if (mtmp && mtmp.data?.pmidx === PM_GREMLIN) gremlins.push(mtmp);
        } else {
            loc.lit = 0;
            // (snuff_light_source(x, y): the light-source list isn't modelled.)
        }
    };
    const { do_clear_area, vision_recalc } = await import('./vision.js');
    do_clear_area(u.ux, u.uy, blessed_effect ? 9 : 5, set_lit);

    if (!Blind()) {
        // C uses vision_recalc(2) here (temporary blindness) so previously seen
        // positions get their waslit bit reset; the port's vision_recalc only
        // implements the ordinary pass.
        vision_recalc(0);
        if (punished && !on)
            move_bc(0, 0, u.uball.ox, u.uball.oy, u.uchain.ox, u.uchain.oy);
    }
    if (gremlins.length) {
        vision_recalc(0);
        for (const gremlin of gremlins) {
            // C ref: zap.c light_hits_gremlin(mon, rnd(5)) — the rnd(5) fires
            // for each gremlin the light reached, before any damage handling.
            rnd(5);
        }
    }
}

// C ref: read.c seffect_remove_curse() — scroll of remove curse (and the
// identical spellbook-cast effect).  The per-item invent loop is the whole
// point of the scroll and had been skipped: without it nothing is ever
// uncursed, so a cursed weapon stays welded, a cursed ring stays stuck, and
// every later predicate that reads obj->cursed answers the wrong way.
// (The riding-steed saddle case needs u.usteed + which_armor(); the
// buried-ball TT_BURIEDBALL follow-up needs buried_ball_to_freedom().)
async function seffect_remove_curse(sobj) {
    const otyp = sobj.otyp;
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = Confused();
    const hallu = Hallucination();
    const feel = !hallu
        ? (!confused ? 'like someone is helping you.' : 'like you need some help.')
        : (!confused ? 'in touch with the Universal Oneness.' : 'the power of the Force against you!');
    await update_topl(`You feel ${feel}`);

    if (scursed) {
        await update_topl('The scroll disintegrates.');
    } else {
        // C walks invent remembering nobj first, because the confused case can
        // curse the secondary weapon and drop it out of the chain mid-loop.
        for (const obj of [...(game.invent || [])]) {
            if (obj.oclass === COIN_CLASS) continue;
            // hide the current scroll from itself
            if (obj === sobj && (obj.quan ?? 1) === 1) continue;
            let wornmask = (obj.owornmask || 0) & ~W_BALL;
            if (wornmask && !sblessed) {
                if (obj === game.uswapwep) {
                    if (!game.u?.twoweap) wornmask = 0;
                } else if (obj === game.uquiver) {
                    if (obj.oclass === WEAPON_CLASS) {
                        if (!objects[obj.otyp]?.oc_merge) wornmask = 0;
                    } else {
                        // GEM_CLASS needs uslinging(); weptools never qualify.
                        wornmask = 0;
                    }
                }
            }
            if (sblessed || wornmask || obj.otyp === LOADSTONE
                || (obj.otyp === LEASH && obj.leashmon)) {
                if (confused) {
                    // C ref: mkobj.c blessorcurse(obj, 2) — rn2(2)-gated, so
                    // this loop is RNG-visible for a confused hero.
                    blessorcurse(obj, 2);
                    obj.bknown = 0;
                } else if (obj.cursed) {
                    uncurse(obj);
                    if (obj.bknown && otyp === SCR_REMOVE_CURSE)
                        learnscrolltyp(SCR_REMOVE_CURSE);
                }
            }
        }
    }
    // C ref: ball.c unpunish() — the ball & chain fall away.  Not conditional
    // on the scroll's curse status in C.
    if (game.u?.uball && !confused)
        await unpunish();
}

// C ref: ball.c unpunish() — free the hero of the ball & chain: the chain is
// obfree'd and the ball moved to the floor (dealloc_obj in C only when it was
// carried; placebc's floor copies are just unlinked here).  No RNG.
async function unpunish() {
    const u = game.u;
    const uchain = u.uchain, uball = u.uball;
    if (uchain) {
        const objs = game.level?.objects;
        if (objs) {
            const i = objs.indexOf(uchain);
            if (i >= 0) objs.splice(i, 1);
        }
        uchain.owornmask = 0;
        u.uchain = null;
        newsym(uchain.ox, uchain.oy);
    }
    if (uball) {
        uball.owornmask = 0;
        uball.spe = 0;
        u.uball = null;
    }
    u.bc_felt = 0;
}

// C ref: read.c:1850 seffect_fire(sobjp) — the scroll of fire / fireball spell.
// The damage roll happens BEFORE useup(), and explode() applies it; the blessed
// arm's getpos() consumes real input, so it must not be skipped.
// ZT_SPELL_O_FIRE is 11 (splatter_burning_oil's kludge, explode.c:966).
async function seffect_fire(sobj) {
    const u = game.u;
    const otyp = sobj.otyp;
    const SCR_FIRE_OTYP = 339;
    const sblessed = !!sobj.blessed;
    const confused = !!Confused();
    const already_known = (sobj.oclass === SPBOOK_CLASS
                           || !!objects[otyp]?.oc_name_known);
    const cc = { x: u.ux, y: u.uy };
    const cval = (sobj.blessed ? 1 : 0) - (sobj.cursed ? 1 : 0);
    let dam = Math.trunc((2 * (rn1(3, 3) + 2 * cval) + 1) / 3);
    useup(sobj);
    if (!already_known) learnscrolltyp(SCR_FIRE_OTYP);
    if (confused) {
        // Fire_resistance / Underwater are not reachable for the covered
        // heroes; the ordinary confused arm burns a hand for 1 HP (no RNG).
        await pline(`The scroll catches fire and you burn your ${
            body_part_hands()}.`);
        u.uhp = (u.uhp | 0) - 1;
        game.disp = game.disp || {};
        game.disp.botl = true;
        return;
    }
    if (sblessed) {
        if (!already_known) await pline('This is a scroll of fire!');
        dam *= 5;
        await pline('Where do you want to center the explosion?');
        const { getpos } = await import('./hack.js');
        const pos = await getpos('the desired position', u.ux, u.uy, null, true, true);
        if (pos && pos.x != null) { cc.x = pos.x; cc.y = pos.y; }
    }
    if (cc.x === u.ux && cc.y === u.uy) {
        await pline('The scroll erupts in a tower of flame!');
        // burn_away_slime(): only matters to a sliming hero, and draws no RNG.
    }
    const { explode } = await import('./explode.js');
    const { EXPL_FIERY } = await import('./const.js');
    await explode(cc.x, cc.y, 11 /*ZT_SPELL_O_FIRE*/, dam, SCROLL_CLASS, EXPL_FIERY);
}

// C ref: body.c body_part(HAND) pluralised — "hands" for a normal hero.
function body_part_hands() { return 'hands'; }

// C ref: read.c learnscrolltyp(scrolltyp) — makeknown + more_experienced(0,10),
// only for a not-yet-identified type.  Returns whether it did anything.
function learnscrolltyp(scrolltyp) {
    if (!objects[scrolltyp]?.oc_name_known) {
        makeknown(scrolltyp);
        more_experienced(0, 10);
        return true;
    }
    return false;
}

// C ref: potion.c strange_feeling(obj, txt) — the generic "nothing visible
// happened" scroll/potion feedback:
//   if (flags.beginner || !txt) You("have a %s feeling...") else pline1(txt);
//   if (!obj) return;
//   if (obj->dknown) trycall(obj);
//   useup(obj);
// The trycall() was missing: C ASKS the player to name the (still unidentified)
// scroll here — an input-consuming prompt.  Skipping it left those keystrokes
// to fall through to the command parser, the doenhance() failure mode.
async function strange_feeling(obj, txt) {
    const beginner = !!game.flags?.beginner;
    if (beginner || !txt)
        await pline_append(`You have a ${Hallucination() ? 'normal' : 'strange'} feeling for a moment, then it passes.`);
    else
        await pline_append(txt);
    if (!obj) return;
    if (obj.dknown) await trycall(obj);
    useup(obj);
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
    // (C's own tail here is `if (ret) stop_occupation();` — deliberately NOT
    // ported: the port's stop_occupation() ends in nomul(0), whose "must leave
    // the occupation armed" behaviour differs, and no scroll can be read while
    // an occupation is running anyway.)
    if (ret) find_ac();
    return ret;
}

// C ref: read.c p_glow2(otmp, color) — "Your <obj> is covered by a mottled
// <color> glow!" / "feels warm for a moment" when blind.
async function p_glow2(otmp, color) {
    if (Blind()) {
        otmp.rknown = false;
        await pline_append(`${Yobjnam2_wep(otmp, 'feel')} warm for a moment.`);
    } else {
        otmp.rknown = true;
        await pline_append(`${Yobjnam2_wep(otmp, 'are')} covered by a mottled ${hcolor_wep(color)} glow!`);
    }
}

// C ref: do_wear.c disintegrate_arm(atmp) — destroy one worn armor piece
// outright.  maybe_destroy_armor() rolls obj_resists(armor, 0, 90) for each
// candidate slot in order (cloak, suit, shirt, helm, gloves, boots, shield),
// stopping at the first that doesn't resist, so this is RNG-visible.
async function disintegrate_arm(atmp) {
    const { obj_resists } = await import('./zap.js');
    const slots = ['uarmc', 'uarm', 'uarmu', 'uarmh', 'uarmg', 'uarmf', 'uarms'];
    let resistedc = false, resistedsuit = false;
    for (const slot of slots) {
        const armor = game[slot];
        // C: the cloak resisting shields the suit and shirt beneath it; the
        // suit resisting shields the shirt.
        if (slot === 'uarm' && resistedc) continue;
        if (slot === 'uarmu' && (resistedc || resistedsuit)) continue;
        if (!armor || (atmp && atmp !== armor)) continue;
        const resisted = obj_resists(armor, 0, 90);
        if (resisted) {
            if (slot === 'uarmc') resistedc = true;
            else if (slot === 'uarm') resistedsuit = true;
            continue;
        }
        armor.in_use = 1;
        await pline_append(`${Yname2_wep(armor)} crumbles and turns to dust!`);
        await remove_worn_item(armor, false);
        useup(armor);
        const { stop_occupation } = await import('./hack.js');
        await stop_occupation();
        return 1;
    }
    return 0;
}

// C ref: read.c disintegrate_cursed_armor() — pick one CURSED worn piece at
// random (rn2 over the cursed ones) and disintegrate it.
async function disintegrate_cursed_armor() {
    const armors = ['uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu']
        .map((slot) => game[slot]).filter((o) => o && o.cursed);
    if (!armors.length) return false;
    return !!(await disintegrate_arm(armors[rn2(armors.length)]));
}

// C ref: potion.c make_stunned(xtime, talk) — sets HStun; no RNG.
function make_stunned(xtime, _talk) {
    const u = game.u;
    if (!u) return;
    if (!u.uprops) u.uprops = {};
    u.uprops.Stun = xtime;
    u.ustun = xtime > 0;
    if (game.disp) game.disp.botl = true;
}

// C ref: do_wear.c any_worn_armor_ok(obj) — getobj callback for the blessed
// scroll's "which armor?" prompt.
function any_worn_armor_ok(obj) {
    const W_ARMOR = 0x1f; // C ref: prop.h W_ARM|W_ARMC|W_ARMH|W_ARMS|W_ARMG|W_ARMF|W_ARMU
    if (obj && (obj.owornmask & W_ARMOR)) return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// C ref: read.c seffect_destroy_armor() — scroll of destroy armor.  Returns
// true if the scroll was consumed here (strange_feeling's useup); false to
// let doread()'s generic makeknown/useup path handle it (the destroy_arm
// success case, matching C's fall-through that only sets gk.known).
async function seffect_destroy_armor(sobj) {
    let otmp = some_armor(); // C computes this unconditionally (RNG side effects)
    const scursed = !!sobj.cursed;
    const confused = Confused();

    if (confused) {
        if (!otmp) {
            await strange_feeling(sobj, 'Your bones itch.');
            exercise(A_STR, false);
            exercise(A_CON, false);
            return true;
        }
        const new_erodeproof = scursed;
        otmp.oerodeproof = 0; // for messages
        await p_glow2(otmp, 'purple');
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return false;
    }

    if (scursed) {
        if (otmp && otmp.cursed) {
            // armor and scroll both cursed
            await pline_append(`${Yobjnam2_wep(otmp, 'vibrate')}.`);
            if ((otmp.spe ?? 0) >= -6) {
                otmp.spe = (otmp.spe || 0) - 1;
                adj_abon(otmp, -1);
            }
            make_stunned(((game.u?.uprops?.Stun || 0)) + rn1(10, 10), true);
        } else if (await disintegrate_arm(otmp)) {
            game.known = true;
            return false;
        }
        return false;
    }

    const gets_choice = !!(otmp && sobj.blessed && count_worn_armor() > 1);
    if (gets_choice) {
        if (!objects[sobj.otyp]?.oc_name_known)
            await pline_append('This is a scroll of destroy armor!');
        game.known = true;
        const atmp = await getobj('destroy', any_worn_armor_ok, GETOBJ_PROMPT);
        if (any_worn_armor_ok(atmp) === GETOBJ_SUGGEST) otmp = atmp;
        if (await disintegrate_arm(otmp)) {
            game.known = true;
            return false;
        }
        return false;
    }
    if (sobj.blessed && await disintegrate_cursed_armor()) {
        game.known = true;
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
    const is_scroll = (sobj.oclass === SCROLL_CLASS);
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    // C ref: `boolean confused = (Confusion != 0)`.  This used to read
    // game.u.Confusion, which no file in the port ever writes (the timer lives
    // on u.uprops.Confusion), so the confused branch was permanently dead.
    const confused = Confused();
    // C ref: `already_known = (sobj->oclass == SPBOOK_CLASS || oc_name_known)`
    // — a spell cast never re-announces the scroll.
    const already_known = !is_scroll || !!objects[otyp]?.oc_name_known;

    // C: the scroll (not the spell) is used up before learnscrolltyp()/the
    // empty-invent check.
    if (is_scroll) useup(sobj);

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
        await update_topl(`You're not carrying anything${is_scroll ? ' else' : ''} to be identified.`);
    }
}

// C ref: exper.c more_experienced(exper, rexp) — add to experience/score; no
// RNG, level-up is checked separately.  Reading an identify scroll grants
// rexp 10 (no exp points), which never triggers a level change here.
// The trailing `flags.beginner = FALSE` IS real state: it flips
// strange_feeling()'s message from the generic "strange feeling" line to the
// caller's specific text.
function more_experienced(exper, rexp) {
    const u = game.u;
    if (!u) return;
    u.uexp = (u.uexp || 0) + exper;
    u.urexp = (u.urexp || 0) + 4 * exper + rexp;
    if (u.urexp >= (Role_if_wizard() ? 1000 : 2000)) {
        game.flags = game.flags || {};
        game.flags.beginner = false;
    }
}

// C ref: read.c doread CREDIT_CARD — card_msgs[]; the LAST entry is reserved
// for an artifact card, so the o_id modulus is over SIZE-1.
const CARD_MSGS = [
    'Leprechaun Gold Tru$t - Shamrock Card',
    'Magic Memory Vault Charge Card',
    'Larn National Bank',
    'First Bank of Omega',
    'Bank of Zork - Frobozz Magic Card',
    "Ankh-Morpork Merchant's Guild Barter Card",
    "Ankh-Morpork Thieves' Guild Unlimited Transaction Card",
    'Ransmannsby Moneylenders Association',
    'Bank of Gehennom - 99% Interest Card',
    'Yendorian Express - Copper Card',
    'Yendorian Express - Silver Card',
    'Yendorian Express - Gold Card',
    'Yendorian Express - Mithril Card',
    'Yendorian Express - Platinum Card', /* must be last */
];

// C ref: read.c doread MAGIC_MARKER — red_mons[] (PM indices, resolved against
// makemon.js's MONS ordering, which carries the mail daemon like C's).
const RED_MONS = [
    3 /*fire ant*/, 11 /*pyrolisk*/, 26 /*hell hound*/, 52 /*imp*/,
    65 /*large mimic*/, 83 /*leocrotta*/, 97 /*scorpion*/, 117 /*xan*/,
    127 /*giant bat*/, 216 /*water moccasin*/, 255 /*flesh golem*/,
    293 /*barbed devil*/, 294 /*marilith*/, 317 /*piranha*/,
];

// C ref: read.c candy_wrappers[] — indexed by obj->spe (assign_candy_wrapper
// rolls 1 + rn2(SIZE-1) at creation, so entry 0 "should never happen").
const CANDY_WRAPPERS = [
    '', 'Apollo', 'Moon Crunchy', 'Snacky Cake', 'Chocolate Nuggie',
    'The Small Bar', 'Crispy Yum Yum', 'Nilla Crunchie', 'Berry Bar',
    'Choco Nummer', 'Om-nom', 'Fruity Oaty', 'Wonka Bar',
];

// C ref: read.c doread — `if (!u.uconduct.literate++) livelog_printf(...)`.
// Score/livelog only, no RNG, but the counter itself is real state.
function bump_literate() {
    const u = game.u;
    if (!u) return;
    u.uconduct = u.uconduct || {};
    u.uconduct.literate = (u.uconduct.literate || 0) + 1;
}

// C ref: role.h Role_if(PM_TOURIST).
function Role_if_tourist() {
    return (game.u?.urole?.name?.m || game.u?.urole?.name || '') === 'Tourist';
}

// C ref: objnam.c simpleonames(obj) — the bare object name (no quantity,
// no bless/curse, no enchantment); xname() is close enough for the two
// conical hats this is used for.
function simpleonames_read(obj) { return xname(obj); }

// C ref: read.c hawaiian_motif() / hawaiian_design() — a Hawaiian shirt's
// printed design.  Both indices are a 32-bit hash of the shirt's o_id against
// ubirthday (the game-start wall clock), so the same shirt always reads the
// same way within a game but differs between games; no RNG is drawn.  The two
// hashes deliberately differ (`ubirthday` vs `~ubirthday`) so that list sizes
// sharing a factor cannot lock out combinations.
const HAWAIIAN_MOTIFS = [
    /* birds */
    'flamingo', 'parrot', 'toucan', 'bird of paradise',
    /* sea creatures */
    'sea turtle', 'tropical fish', 'jellyfish', 'giant eel', 'water nymph',
    /* plants */
    'plumeria', 'orchid', 'hibiscus flower', 'palm tree',
    /* other */
    'hula dancer', 'sailboat', 'ukulele',
];
const HAWAIIAN_BGS = [
    /* solid colors */
    'purple', 'yellow', 'red', 'blue', 'orange', 'black', 'green',
    /* adjectives */
    'abstract', 'geometric', 'patterned', 'naturalistic',
];
// C ref: u_init.c ubirthday — the game-start wall clock in seconds, cast to
// `unsigned` (32 bits) by both hashes.  js/shk.js owns the same derivation for
// get_cost()'s glass-gem bit; keep the two in step.
const UBIRTHDAY_UTC_OFFSET = -4 * 3600;
function ubirthday_secs() {
    if (typeof game.ubirthday === 'number' && game.ubirthday) return game.ubirthday;
    const dt = String(game.datetime || '');
    if (!/^\d{14}$/.test(dt)) return 0;
    const y = +dt.slice(0, 4), mo = +dt.slice(4, 6), d = +dt.slice(6, 8);
    const h = +dt.slice(8, 10), mi = +dt.slice(10, 12), sec = +dt.slice(12, 14);
    return Math.trunc(Date.UTC(y, mo - 1, d, h, mi, sec) / 1000) - UBIRTHDAY_UTC_OFFSET;
}
export function hawaiian_motif(shirt) {
    const motif = ((shirt?.o_id | 0) ^ (ubirthday_secs() | 0)) >>> 0;
    return HAWAIIAN_MOTIFS[motif % HAWAIIAN_MOTIFS.length];
}
function hawaiian_design(shirt) {
    const bg = ((shirt?.o_id | 0) ^ (~ubirthday_secs() | 0)) >>> 0;
    const bgword = HAWAIIAN_BGS[bg % HAWAIIAN_BGS.length];
    const article = /^[aeiou]/i.test(bgword) ? 'an' : 'a';
    return `${makeplural(hawaiian_motif(shirt))} on ${article} ${bgword} background`;
}

const T_SHIRT = 137, ALCHEMY_SMOCK = 144, HAWAIIAN_SHIRT = 136,
      DUNCE_CAP = 94, CREDIT_CARD = 223, MAGIC_MARKER = 242, CANDY_BAR = 288,
      SCR_FIRE = 339; // C ref: include/objects.h otyp

// C ref: read.c doread — the 'r' command.  Pick a scroll, spellbook or one of
// the "exotic readables" (fortune cookie, shirt, credit card, ...) and read it.
export async function doread() {
    game.known = false; // C ref: read.c doread — gk.known = FALSE, reset per read
    // C ref: hack.c check_capacity(NULL) — an Overtaxed hero can't read at all;
    // the command ends BEFORE getobj(), so no object is picked and no turn is
    // consumed.  Omitting it let an overloaded hero read (and spend the turn).
    if (near_capacity() >= EXT_ENCUMBER) {
        await pline("You can't do that while carrying so much stuff.");
        return ECMD_OK;
    }
    const scroll = await getobj('read', read_ok, GETOBJ_PROMPT);
    if (!scroll)
        return ECMD_CANCEL;
    const otyp = scroll.otyp;
    scroll.pickup_prev = 0; // no longer 'just picked up'

    // ── exotic readables ──
    // Every one of these consumes a turn in C (ECMD_TIME) even though it is
    // "only a message"; the port used to answer "That is a silly thing to
    // read." + ECMD_OK for all of them, i.e. no turn passed at all and the
    // whole monster-movement/PRNG stream shifted from there on.
    if (otyp === FORTUNE_COOKIE) {
        if (game.flags?.verbose !== false)
            await update_topl('You break up the cookie and throw away the pieces.');
        // C ref: rumors.c outrumor(bcsign(scroll), BY_COOKIE) — draws.
        const _engrave = await import('./engrave.js');
        const bcsign = (scroll.blessed ? 1 : 0) - (scroll.cursed ? 1 : 0);
        const line = _engrave.outrumor(bcsign, _engrave.BY_COOKIE);
        if (line) {
            await update_topl('This cookie has a scrap of paper inside.');
            await update_topl('It reads:');
            await update_topl(line);
        }
        if (!Blind()) bump_literate();
        useup(scroll);
        return ECMD_TIME;
    }
    if (otyp === T_SHIRT || otyp === ALCHEMY_SMOCK || otyp === HAWAIIAN_SHIRT) {
        if (Blind()) {
            await pline("You can't feel any Braille writing.");
            return ECMD_OK;
        }
        // can't read shirt worn under suit (under cloak is ok though)
        if ((otyp === T_SHIRT || otyp === HAWAIIAN_SHIRT) && game.uarm
            && scroll === game.uarmu) {
            await pline(`${scroll.unpaid ? 'That' : 'Your'} shirt is obscured by your ${xname(game.uarm)}.`);
            return ECMD_OK;
        }
        if (otyp === HAWAIIAN_SHIRT) {
            // C ref: read.c:392 `pline("%s features %s.", flags.verbose ?
            // "The design" : "It", hawaiian_design(scroll, buf));`
            await pline(`${game.flags?.verbose !== false ? 'The design' : 'It'} features ${hawaiian_design(scroll)}.`);
            return ECMD_TIME;
        }
        bump_literate();
        // (tshirt_text()/apron_text()'s message tables aren't ported; both are
        // o_id-indexed, so no RNG is lost — only the quoted line is wrong.)
        if (game.flags?.verbose !== false)
            await pline('It reads:');
        await pline('""');
        return ECMD_TIME;
    }
    if ((otyp === DUNCE_CAP || otyp === CORNUTHAUM) && Role_if_tourist()) {
        const cap_text = (otyp === DUNCE_CAP) ? 'DUNCE' : 'WIZZARD';
        if ((scroll.o_id ?? 0) % 3) {
            await pline(`You can't find anything to read on this ${simpleonames_read(scroll)}.`);
            return ECMD_OK;
        }
        await pline(`${!Blind() ? 'There is writing' : 'You feel lettering'} on the ${simpleonames_read(scroll)}.  It reads:  ${cap_text}.`);
        bump_literate();
        // "despite the fact that player will recognize the object type, don't
        // make it become a discovery for hero" — trycall() prompts for a name.
        await trycall(scroll);
        return ECMD_TIME;
    }
    if (otyp === CREDIT_CARD) {
        const o_id = scroll.o_id ?? 0;
        if (Blind()) {
            await pline('You feel the embossed numbers:');
        } else {
            if (game.flags?.verbose !== false) await pline('It reads:');
            await pline(`"${CARD_MSGS[o_id % (CARD_MSGS.length - 1)]}"`);
        }
        await pline(`"${((o_id % 89) + 10)}0${o_id % 4} ${((o_id * 499) % 899999) + 100000}${o_id % 10}1 0${(!(o_id % 3)) ? 1 : 0}${(o_id * 7) % 10}0"${(game.flags?.verbose !== false || Blind()) ? '.' : ''}`);
        bump_literate();
        return ECMD_TIME;
    }
    if (otyp === CAN_OF_GREASE) {
        await pline(`This ${xname(scroll)} has no label.`);
        return ECMD_OK;
    }
    if (otyp === MAGIC_MARKER) {
        if (Blind()) {
            await pline("You can't feel any Braille writing.");
            return ECMD_OK;
        }
        if (game.flags?.verbose !== false) await pline('It reads:');
        const { monster_by_pmidx } = await import('./makemon.js');
        const pm = monster_by_pmidx(RED_MONS[(scroll.o_id ?? 0) % RED_MONS.length]);
        await pline(`"Magic Marker(TM) ${(pm?.name || '').toUpperCase()} Red Ink Marker Pen.  Water Soluble."`);
        bump_literate();
        return ECMD_TIME;
    }
    if (scroll.oclass === COIN_CLASS) {
        if (Blind()) await pline('You feel the embossed words:');
        else if (game.flags?.verbose !== false) await pline('You read:');
        await pline('"1 Zorkmid.  857 GUE.  In Frobs We Trust."');
        bump_literate();
        return ECMD_TIME;
    }
    if (otyp === CANDY_BAR) {
        if (Blind()) {
            await pline("You can't feel any Braille writing.");
            return ECMD_OK;
        }
        const wrapper = CANDY_WRAPPERS[(scroll.spe ?? 0) % CANDY_WRAPPERS.length];
        if (!wrapper) {
            await pline("The candy bar's wrapper is blank.");
            return ECMD_OK;
        }
        await pline(`The wrapper reads: "${wrapper}".`);
        bump_literate();
        return ECMD_TIME;
    }
    // (the Orb of Fate "It is signed: Odin." branch needs artifact support.)

    if (scroll.oclass !== SCROLL_CLASS && scroll.oclass !== SPBOOK_CLASS) {
        await pline('That is a silly thing to read.');
        return ECMD_OK;
    }
    // C ref: read.c doread — reading while blind is allowed for the Book of the
    // Dead, for an already-seen scroll label, and for a novel; everything else
    // is refused WITHOUT consuming a turn.  Skipping this let a blind hero
    // study a spellbook (multi-turn occupation + its own RNG) that C rejects.
    if (Blind() && otyp !== SPE_BOOK_OF_THE_DEAD) {
        let what = null;
        if (otyp === SPE_NOVEL) what = 'words';
        else if (scroll.oclass === SPBOOK_CLASS) what = 'mystic runes';
        else if (!scroll.dknown) what = 'formula on the scroll';
        if (what) {
            await pline(`Being blind, you cannot read the ${what}.`);
            return ECMD_OK;
        }
    }

    // C ref: read.c doread — literate conduct.  Score/livelog only (no RNG),
    // but the counter is what gates the SCR_MAIL confirmation prompt.
    if (otyp !== SPE_BOOK_OF_THE_DEAD && otyp !== SPE_NOVEL
        && otyp !== SPE_BLANK_PAPER && otyp !== SCR_BLANK_PAPER)
        bump_literate();

    if (scroll.oclass === SPBOOK_CLASS) {
        return (await study_book(scroll)) ? ECMD_TIME : ECMD_OK;
    }

    scroll.in_use = true;
    if (otyp !== SCR_BLANK_PAPER) {
        const silently = !can_chant();
        // C ref: read.c doread — nodisappear: a few scroll feedback messages
        // describe something happening to the scroll itself (SCR_FIRE, and a
        // cursed SCR_REMOVE_CURSE which disintegrates instead), so those skip
        // "...it disappears." in favor of a plain "You read the scroll."
        const nodisappear = (otyp === SCR_FIRE
                             || (otyp === SCR_REMOVE_CURSE && scroll.cursed));
        if (Blind())
            await pline(nodisappear
                ? `You ${silently ? 'cogitate' : 'pronounce'} the formula on the scroll.`
                : `As you ${silently ? 'cogitate' : 'pronounce'} the formula on it, the scroll disappears.`);
        else
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
        if (Confused()) {
            if (Hallucination())
                await update_topl('Being so trippy, you screw up...');
            else
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
