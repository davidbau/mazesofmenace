// read.js — Read command / scroll effects (partial).
// C ref: read.c doread, seffects, seffect_magic_mapping, seffect_teleportation,
// seffect_light / litroom / set_lit, seffect_remove_curse,
// seffect_enchant_weapon, seffect_punishment / punish, seffect_genocide,
// seffect_create_monster, do_class_genocide, do_genocide; mondata.c name_to_monclass;
// invent.c getobj; detect.c do_mapping; spell.c study_book (via spell.js);
// teleport.c scrolltele/safe_teleds; zap.c lightdamage (D-1366);
// do_name.c trycall; mkobj.c uncurse/blessorcurse; wield.c chwepon;
// ball.c placebc.
//
// Branch envelope: getobj read loop (scrolls/spellbooks + ?/* pickinv) +
// SCROLL_CLASS path for SCR_MAGIC_MAPPING / SCR_TELEPORTATION / SCR_LIGHT /
// SCR_REMOVE_CURSE / SCR_ENCHANT_WEAPON / SCR_DESTROY_ARMOR / SCR_IDENTIFY /
// SCR_PUNISHMENT / SCR_GENOCIDE +
// SPBOOK_CLASS → study_book (already-known refresh yn) + create_particular
// named-monster path for #wizgenesis + do_genocide REALLY|ONTHRONE getlin
// (throne sit case 8, D-1034) + seffects SCR_GENOCIDE / do_class_genocide
// (D-1098) + seffect_create_monster SCR/SPE_CREATE_MONSTER (D-1401) +
// SPE_MAGIC_MAPPING seffects (D-1407; callee seffect_magic_mapping) +
// seffect_taming SCR_TAMING/SPE_CHARM_MONSTER + recharge/charge_ok (D-1502).
// Named omissions: fortune/shirt/credit-card/marker/coin/orb/candy/Braille
// Blind gates; study_book novel / dull sleep (occupation learn D-0907);
// other seffect_*; SCR_IDENTIFY SPE_IDENTIFY cast; menu_identify traditional
// ggetobj; discover_artifact / learn_egg_type in fully_identify_obj;
// SCR_DESTROY_ARMOR confused erodeproof / cursed vibrate+stun /
// blessed getobj choice / disintegrate_cursed_armor; Rogue unblock_point
// vs vision_recalc on blessed SDOOR; can_chant poly silent/
// headless/buzz/burble;
// SPE_REMOVE_CURSE seffects
// arm (throne fake book D-1033; #cast still deferred);
// Teleport_control getpos; confused light yellow/black-light pets;
// snuff_lit / impact_arti_light / Punished ball; gremlin light-hit list;
// Rogue whole-room light; Sunsword radius-0; remove-curse shop water
// costly_alteration; Punished/unpunish; buried_ball_to_freedom; steed saddle
// Yobjnam2 glow; update_inventory; enchant-weapon confused erodeproof
// Yobjnam2/hcolor polish; twoweapon secondary; shop costly_alteration on
// proof strip; create_particular class-letter / * random / cant_revive yn /
// tame|peaceful|hostile|saddled|sleeping|invisible|hidden prefixes /
// create_particular → makemon_appear_msg (makemon in-body still deferred;
// mimic mhidden_description / set_msg_xy / dochugw omit);
// punish Blind set_bc; flooreffects on placebc; HEAVY_IRON_BALL reuse
// from angrygods; do_genocide livelog / Hallucination names /
// vampshifted POLY_REVERT / chameleon newcham; update_inventory.
//
// Branch envelope: getobj read loop (scrolls/spellbooks + ?/* pickinv) +
// SCROLL_CLASS path for SCR_MAGIC_MAPPING / SCR_TELEPORTATION / SCR_LIGHT /
// SCR_REMOVE_CURSE / SCR_ENCHANT_WEAPON / SCR_DESTROY_ARMOR / SCR_IDENTIFY /
// SCR_PUNISHMENT / SCR_GENOCIDE +
// SPBOOK_CLASS → study_book (already-known refresh yn) + create_particular
// named-monster path for #wizgenesis.
// Named omissions: fortune/shirt/credit-card/marker/coin/orb/candy/Braille
// Blind gates; study_book novel / dull sleep (occupation learn D-0907);
// other seffect_*; SCR_IDENTIFY SPE_IDENTIFY cast; menu_identify traditional
// ggetobj; discover_artifact / learn_egg_type in fully_identify_obj;
// SCR_DESTROY_ARMOR confused erodeproof / cursed vibrate+stun /
// blessed getobj choice / disintegrate_cursed_armor; Rogue unblock_point
// vs vision_recalc on blessed SDOOR; can_chant poly silent/
// headless/buzz/burble;
// SPE_REMOVE_CURSE seffects
// arm (throne fake book D-1033; #cast still deferred);
// Teleport_control getpos; confused light yellow/black-light pets;
// snuff_lit / impact_arti_light / Punished ball; gremlin light-hit list;
// Rogue whole-room light; Sunsword radius-0; remove-curse shop water
// costly_alteration; Punished/unpunish; buried_ball_to_freedom; steed saddle
// Yobjnam2 glow; update_inventory; enchant-weapon confused erodeproof
// Yobjnam2/hcolor polish; twoweapon secondary; shop costly_alteration on
// proof strip; create_particular class-letter / * random / cant_revive yn /
// tame|peaceful|hostile|saddled|sleeping|invisible|hidden prefixes /
// create_particular → makemon_appear_msg (makemon in-body still deferred;
// mimic mhidden_description / set_msg_xy / dochugw omit);
// punish Blind set_bc; flooreffects on placebc; HEAVY_IRON_BALL reuse
// from angrygods.

import { game } from './gstate.js';
import { pline, urgent_pline, newsym, You_feel, verbalize, canspotmon } from './display.js';
import { xname, makeplural, an, vtense, otyp_is_charged } from './objnam.js';
import {
    SCROLL_CLASS, SPBOOK_CLASS, COIN_CLASS, WEAPON_CLASS, GEM_CLASS,
    ARMOR_CLASS, BALL_CLASS, CHAIN_CLASS, WAND_CLASS, RING_CLASS, TOOL_CLASS,
    NODIR, objectNames,
} from './objects.js';
import { weight, uncurse, curse, bless, blessorcurse, mkobj, delobj } from './mkobj.js';
import { A_WIS, A_STR, A_CON, exercise, adjalign } from './attrib.js';
import {
    makeknown, getobj, identify_pack, near_capacity,
} from './invent.js';
import { more_experienced } from './exper.js';
import { do_mapping, cvt_sdoor_to_door } from './detect.js';
import { study_book, can_chant } from './spell.js';
import { scrolltele, level_tele } from './teleport.js';
import { trycall, hcolor } from './do_name.js';
import { chwepon, is_weptool } from './wield.js';
import { destroy_arm, some_armor, setworn } from './do_wear.js';
import { dropy } from './do.js';
import { placebc } from './ball.js';
import { rn2, rnd, rn1, d } from './rng.js';
import {
    COLNO, ROWNO, SDOOR, CORR, ROOMOFFSET, Is_rogue_level, Is_waterlevel,
    HEAD, isok,
    W_BALL, W_CHAIN, W_ART, W_ARTI, W_SADDLE, P_SLING, SPE_LIM, MM_NOEXCLAM,
    NO_MM_FLAGS, WT_IRON_BALL_INCR, thats_enough_tries, EXT_ENCUMBER,
    GENOCIDED, KILLED_BY, KILLED_BY_AN, NO_MINVENT, MM_NOMSG, Upolyd,
    nothing_happens, G_GENOD, G_EXTINCT, UNCHANGING,
    GETOBJ_EXCLUDE, GETOBJ_DOWNPLAY, GETOBJ_SUGGEST, GETOBJ_PROMPT,
    GETOBJ_EXCLUDE_SELECTABLE,
    LEFT_RING, RIGHT_RING, COST_UNCHRG, COST_DECHNT, NOTELL,
} from './const.js';
import { vision_recalc, do_clear_area } from './vision.js';
import { getlin } from './getline.js';
import { name_to_mon, name_to_monclass } from './mondata.js';
import { mons, NON_PM, LOW_PM, NUMMONS, amorphous, is_whirly, unsolid,
    G_GENO, G_UNIQ, G_NOCORPSE, is_human, is_demon, pmnames, NEUTRAL,
    M2_PNAME, monsterNames, nonliving, weirdnonliving, PM_ACID_BLOB,
} from './monsters.js';
import { makemon, makemon_appear_msg, rndmonst, create_critters } from './makemon.js';
import { kill_genocided_monsters, mongone, m_at, setmangry } from './mon.js';
import { done } from './end.js';
import { ART_SUNSWORD } from './generated/artifacts_data.js';

const SCR_MAGIC_MAPPING = objectNames.indexOf('SCR_MAGIC_MAPPING');
const SPE_MAGIC_MAPPING = objectNames.indexOf('SPE_MAGIC_MAPPING');
const SCR_TELEPORTATION = objectNames.indexOf('SCR_TELEPORTATION');
const SCR_LIGHT = objectNames.indexOf('SCR_LIGHT');
const SCR_REMOVE_CURSE = objectNames.indexOf('SCR_REMOVE_CURSE');
const SPE_REMOVE_CURSE = objectNames.indexOf('SPE_REMOVE_CURSE');
const SCR_ENCHANT_WEAPON = objectNames.indexOf('SCR_ENCHANT_WEAPON');
const SCR_DESTROY_ARMOR = objectNames.indexOf('SCR_DESTROY_ARMOR');
const SCR_IDENTIFY = objectNames.indexOf('SCR_IDENTIFY');
const SCR_PUNISHMENT = objectNames.indexOf('SCR_PUNISHMENT');
const SCR_GENOCIDE = objectNames.indexOf('SCR_GENOCIDE');
const SCR_CREATE_MONSTER = objectNames.indexOf('SCR_CREATE_MONSTER');
const SPE_CREATE_MONSTER = objectNames.indexOf('SPE_CREATE_MONSTER');
const SCR_BLANK_PAPER = objectNames.indexOf('SCR_BLANK_PAPER');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const LEASH = objectNames.indexOf('LEASH');
const SLING = objectNames.indexOf('SLING');
const POT_WATER = objectNames.indexOf('POT_WATER');
const _on = (n) => objectNames.indexOf(n);
const SCR_TAMING = _on('SCR_TAMING'), SPE_CHARM_MONSTER = _on('SPE_CHARM_MONSTER');
const WAN_WISHING = _on('WAN_WISHING'), WAN_CANCELLATION = _on('WAN_CANCELLATION');
const WAN_DEATH = _on('WAN_DEATH'), WAN_POLYMORPH = _on('WAN_POLYMORPH');
const WAN_UNDEAD_TURNING = _on('WAN_UNDEAD_TURNING'), WAN_COLD = _on('WAN_COLD');
const WAN_FIRE = _on('WAN_FIRE'), WAN_LIGHTNING = _on('WAN_LIGHTNING');
const WAN_MAGIC_MISSILE = _on('WAN_MAGIC_MISSILE'), WAN_NOTHING = _on('WAN_NOTHING');
const BELL_OF_OPENING = _on('BELL_OF_OPENING'), MAGIC_MARKER = _on('MAGIC_MARKER');
const TINNING_KIT = _on('TINNING_KIT'), EXPENSIVE_CAMERA = _on('EXPENSIVE_CAMERA');
const OIL_LAMP = _on('OIL_LAMP'), BRASS_LANTERN = _on('BRASS_LANTERN');
const MAGIC_LAMP = _on('MAGIC_LAMP'), HORN_OF_PLENTY = _on('HORN_OF_PLENTY');
const BAG_OF_TRICKS = _on('BAG_OF_TRICKS'), CAN_OF_GREASE = _on('CAN_OF_GREASE');
const MAGIC_FLUTE = _on('MAGIC_FLUTE'), MAGIC_HARP = _on('MAGIC_HARP');
const FROST_HORN = _on('FROST_HORN'), FIRE_HORN = _on('FIRE_HORN');
const DRUM_OF_EARTHQUAKE = _on('DRUM_OF_EARTHQUAKE'), CRYSTAL_BALL = _on('CRYSTAL_BALL');
const NH_BLUE = 'blue', NH_WHITE = 'white', NH_BLACK = 'black';
const NH_LIGHT_BLUE = 'light blue', NH_AMBER = 'amber';

/** C gk.known — scroll effect observed this read */
let known = false;

/**
 * C ref: read.c read_ok — scrolls/books SUGGEST; other invent DOWNPLAY
 * (shirts, coins, cookies); hands EXCLUDE.
 */
function read_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS) {
        return GETOBJ_SUGGEST;
    }
    return GETOBJ_DOWNPLAY;
}

/**
 * C ref: invent.c getobj("read", read_ok, GETOBJ_PROMPT)
 */
async function getobj_read() {
    return getobj('read', read_ok, GETOBJ_PROMPT);
}

/** C ref: invent.c useup() — consume one from a stack / remove if gone. */
function useup(otmp) {
    if (!otmp) return;
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        otmp.owt = weight(otmp);
        return;
    }
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
}

/**
 * C ref: read.c learnscrolltyp / learnscroll — makeknown + XP when new.
 */
function learnscroll(scroll) {
    if (!scroll || scroll.oclass === SPBOOK_CLASS) return;
    const otyp = scroll.otyp | 0;
    const oc = game.objects?.[otyp];
    if (!oc) return;
    if (!game.u?.Blind) scroll.dknown = true;
    if (!oc.oc_name_known) {
        makeknown(otyp);
        more_experienced(0, 10);
    }
}

/**
 * C ref: read.c seffect_magic_mapping `:2102–2153`.
 * Scroll nommap: crazy-lines + Hallu modern-art else body_part(HEAD)
 * bewilderment then make_confused(HConfusion+rnd(30), FALSE).
 * Blessed scroll converts SDOOR (Rogue unblock_point named —
 * JS vision_recalc+newsym). Spell nommap: body_part(HEAD) + something
 * blocks then same make_confused. Else "A map coalesces", cursed
 * unconfused HConfusion=1 screw (JS u.Confusion for do_mapping),
 * notice_mon_off / do_mapping / notice_mon_on. Callers: seffects
 * SCR_MAGIC_MAPPING (D-0075) / SPE_MAGIC_MAPPING (spell.c
 * spelleffects D-1407). Dynamic import: potion.js / polyself.js /
 * hack.js cycle through eat.js.
 */
async function seffect_magic_mapping(sobj) {
    const is_scroll = sobj.oclass === SCROLL_CLASS;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const u = game.u || (game.u = {});
    const confused = !!(u.Confusion);
    const lf = game.level?.flags;

    if (is_scroll) {
        if (lf?.nommap) {
            const { body_part } = await import('./polyself.js');
            const { make_confused } = await import('./potion.js');
            await pline('Your mind is filled with crazy lines!');
            if (u.Hallucination) await pline('Wow!  Modern art.');
            else await pline(`Your ${body_part(HEAD)} spins in bewilderment.`);
            await make_confused((u.HConfusion | 0) + rnd(30), false);
            return;
        }
        if (sblessed) {
            for (let x = 1; x < COLNO; x++) {
                for (let y = 0; y < ROWNO; y++) {
                    const lev = game.level?.at(x, y);
                    if (!lev || lev.typ !== SDOOR) continue;
                    cvt_sdoor_to_door(lev);
                    if (Is_rogue_level(u.uz)) vision_recalc(1);
                    newsym(x, y);
                }
            }
        }
        known = true;
    }

    if (lf?.nommap) {
        const { body_part } = await import('./polyself.js');
        const { make_confused } = await import('./potion.js');
        await pline(
            `Your ${body_part(HEAD)} spins as something blocks the spell!`,
        );
        await make_confused((u.HConfusion | 0) + rnd(30), false);
        return;
    }
    await pline('A map coalesces in your mind!');
    const cval = scursed && !confused;
    if (cval) u.Confusion = 1; // C: HConfusion = 1 to screw up map
    const { notice_mon_off, notice_mon_on } = await import('./hack.js');
    notice_mon_off();
    do_mapping();
    notice_mon_on();
    if (cval) {
        u.Confusion = 0;
        await pline("Unfortunately, you can't grasp the details.");
    }
}

/**
 * C ref: read.c seffect_teleportation
 * Uncursed unconfused → scrolltele (learnscroll inside).
 * Cursed/confused → level_tele + known (D-0575).
 */
async function seffect_teleportation(sobj) {
    const scursed = !!sobj.cursed;
    const u = game.u || {};
    // C: Confusion ≡ HConfusion
    const confused = !!(u.HConfusion || u.Confusion);
    if (confused || scursed) {
        await level_tele();
        known = true;
        return;
    }
    await scrolltele(sobj);
    // learnscroll handled inside scrolltele; do not set known here
}

/**
 * C ref: read.c set_lit — levl[x][y].lit = !!val; gremlin queue deferred.
 */
function set_lit(x, y, val) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if (val) {
        loc.lit = 1;
        // PM_GREMLIN light-hit list deferred
    } else {
        loc.lit = 0;
        // snuff_light_source deferred
    }
}

/**
 * C ref: read.c litroom — light/darken nearby terrain + message.
 * Envelope: ordinary scroll light/dark; Rogue whole-room; swallow/water
 * no_op message; vision_recalc(2) + delayed full recalc.
 * Deferred: snuff_lit / artifact_light / Punished move_bc / gremlin hits /
 * Underwater beyond no_op gate.
 */
export async function litroom(on, obj) {
    const u = game.u || {};
    const Blind = !!(u.Blind || u.ublind);
    const blessed_effect = !!(obj && obj.oclass === SCROLL_CLASS && obj.blessed);
    const no_op = !!(u.uswallow || u.Underwater || Is_waterlevel(u.uz));

    if (!on) {
        // Inventory lamp snuff / artifact impact deferred
        if (!Blind) {
            if (u.uswallow) {
                await pline('It seems even darker in here than before.');
            } else {
                await pline('You are surrounded by darkness!');
            }
        }
    } else {
        // Blessed artifact_light impact deferred
        if (u.uswallow) {
            // engulfer-lit messages deferred (Blind-silent matches C)
        } else if (!Blind && (!Is_rogue_level(u.uz)
            || game.level?.at(u.ux, u.uy)?.typ !== CORR)) {
            await pline(`A lit field ${no_op ? 'briefly ' : ''}surrounds you!`);
        }
    }

    if (no_op) return;

    if (Is_rogue_level(u.uz)) {
        const rnum = (game.level?.at(u.ux, u.uy)?.roomno | 0) - ROOMOFFSET;
        const rooms = game.rooms || game.level?.rooms;
        if (rnum >= 0 && rooms?.[rnum]) {
            const rm = rooms[rnum];
            for (let rx = rm.lx - 1; rx <= rm.hx + 1; rx++) {
                for (let ry = rm.ly - 1; ry <= rm.hy + 1; ry++) {
                    set_lit(rx, ry, on ? 1 : null);
                }
            }
            rm.rlit = on ? 1 : 0;
        }
    } else if (obj && (obj.oartifact | 0) === ART_SUNSWORD) {
        // C read.c litroom :2596–2599 — Sunsword #invoke up/down lights
        // the hero cell (do_clear_area rejects radius 0). C always
        // passes &is_lit (light on), not `on`.
        set_lit(u.ux | 0, u.uy | 0, 1);
    } else {
        do_clear_area(
            u.ux, u.uy,
            blessed_effect ? 9 : 5,
            set_lit,
            on ? 1 : null,
        );
    }

    if (!Blind) {
        vision_recalc(2);
        // Punished move_bc restore deferred
    }
    game.vision_full_recalc = 1;
    // gremlin light_hits after forced recalc deferred
}

/**
 * C ref: read.c seffect_light
 * Unconfused: litroom(!cursed) + lightdamage when !cursed (D-1366).
 * Confused yellow/black-light pets deferred (named omission).
 */
async function seffect_light(sobj) {
    const scursed = !!sobj.cursed;
    const confused = !!(game.u?.Confusion);
    const Blind = !!(game.u?.Blind || game.u?.ublind);

    if (!confused) {
        if (!Blind) known = true;
        await litroom(!scursed, sobj);
        if (!scursed) {
            // C zap.c lightdamage — dynamic import avoids zap↔read cycle
            const { lightdamage } = await import('./zap.js');
            if (await lightdamage(sobj, true, 5)) known = true;
        }
    } else {
        // confused PM_YELLOW_LIGHT / PM_BLACK_LIGHT swarm deferred
        await pline('Tiny lights sparkle in the air momentarily.');
    }
}

/** C ref: wield.c / hack.h uslinging — uwep skill is -P_SLING. */
function uslinging() {
    const uwep = game.u?.uwep;
    if (!uwep) return false;
    if (SLING >= 0 && (uwep.otyp | 0) === SLING) return true;
    const skill = game.objects?.[uwep.otyp]?.oc_skill | 0;
    return skill === -P_SLING;
}

/** C ref: invent.c objects[].oc_merge — table field may be absent. */
function oc_merge(otyp) {
    const od = game.objects?.[otyp];
    if (od && typeof od.oc_merge === 'number') return od.oc_merge !== 0;
    // Approximate: mergeable weapon ammo / missiles
    return true;
}

/**
 * C ref: read.c learnscrolltyp — makeknown + XP when new.
 */
function learnscrolltyp(scrolltyp) {
    const oc = game.objects?.[scrolltyp];
    if (!oc) return false;
    if (!oc.oc_name_known) {
        makeknown(scrolltyp);
        more_experienced(0, 10);
        return true;
    }
    return false;
}

/**
 * C ref: read.c seffect_remove_curse
 * Cursed scroll: message only (invent untouched). Else worn/blessed/
 * loadstone/leash uncurse or confused blessorcurse.
 * Deferred: shop POT_WATER costly_alteration/alter_cost; Punished/
 * unpunish; buried_ball_to_freedom; steed saddle Yobjnam2/hcolor glow;
 * update_inventory; SPE_REMOVE_CURSE #cast still deferred (throne fake
 * book hits seffects switch, D-1033).
 */
async function seffect_remove_curse(sobj) {
    const otyp = sobj.otyp | 0;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const u = game.u || {};
    // C youprop.h: #define Confusion HConfusion (no EConfusion). Throne
    // case 10 sets only HConfusion=1L (D-1048); do not OR a flat flag.
    const confused = !!(u.HConfusion | 0);
    const Hallucination = !!(u.Hallucination);

    const feel = !Hallucination
        ? (!confused ? 'like someone is helping you.'
            : 'like you need some help.')
        : (!confused ? 'in touch with the Universal Oneness.'
            : 'the power of the Force against you!');
    await You_feel(feel);

    if (scursed) {
        await pline('The scroll disintegrates.');
    } else {
        // Snapshot invent — confused blessorcurse may drop uswapwep (C nxto)
        const invSnapshot = [...(game.invent || [])];
        for (const obj of invSnapshot) {
            if (!obj) continue;
            if (obj.oclass === COIN_CLASS) continue;
            if (obj === sobj && (obj.quan | 0) === 1) continue;

            let wornmask = (obj.owornmask || 0) & ~(W_BALL | W_ART | W_ARTI);
            if (wornmask && !sblessed) {
                if (obj === u.uswapwep) {
                    if (!u.twoweap) wornmask = 0;
                } else if (obj === u.uquiver) {
                    if (obj.oclass === WEAPON_CLASS) {
                        if (!oc_merge(obj.otyp)) wornmask = 0;
                    } else if (obj.oclass === GEM_CLASS) {
                        if (!uslinging()) wornmask = 0;
                    } else {
                        wornmask = 0;
                    }
                }
            }
            if (sblessed || wornmask
                || (LOADSTONE >= 0 && (obj.otyp | 0) === LOADSTONE)
                || (LEASH >= 0 && (obj.otyp | 0) === LEASH && obj.leashmon)) {
                // shop POT_WATER unpaid costly_alteration / alter_cost deferred
                void POT_WATER;
                if (confused) {
                    blessorcurse(obj, 2);
                    obj.bknown = 0;
                } else if (obj.cursed) {
                    uncurse(obj);
                    if (obj.bknown && otyp === SCR_REMOVE_CURSE) {
                        learnscrolltyp(SCR_REMOVE_CURSE);
                    }
                }
            }
        }
        // Steed saddle: which_armor W_SADDLE + glow deferred (no usteed here)
        if (u.usteed) {
            const minv = u.usteed.minvent;
            let saddle = null;
            for (let o = minv; o; o = o.nobj) {
                if ((o.owornmask || 0) & W_SADDLE) {
                    saddle = o;
                    break;
                }
            }
            // Also scan array-shaped minvent
            if (!saddle && Array.isArray(minv)) {
                saddle = minv.find((o) => (o.owornmask || 0) & W_SADDLE) || null;
            }
            if (saddle) {
                if (confused) {
                    blessorcurse(saddle, 2);
                    saddle.bknown = 0;
                } else if (saddle.cursed) {
                    uncurse(saddle);
                    // Yobjnam2 glow / hcolor("amber") deferred
                    const Blind = !!(u.Blind || u.ublind);
                    if (!Blind) {
                        saddle.bknown = Hallucination ? 0 : 1;
                    } else {
                        saddle.bknown = 0;
                    }
                }
            }
        }
    }
    // Punished → unpunish deferred; TT_BURIEDBALL → buried_ball_to_freedom deferred
    // update_inventory deferred
}

/** C ref: read.c cap_spe — clamp |spe| to SPE_LIM. */
function cap_spe(obj) {
    if (!obj) return;
    const spe = obj.spe | 0;
    const lim = SPE_LIM;
    if (Math.abs(spe) > lim) {
        obj.spe = (spe < 0 ? -1 : 1) * lim;
    }
}

/** C youprop.h Blind — (H||E Blinded) && !BBlinded. */
function Blind_read() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}
function Yobjnam2_read(obj, verb) {
    const nam = xname(obj);
    return `Your ${nam} ${vtense(nam, verb)}`;
}
function Yname2_read(obj) { return `Your ${xname(obj)}`; }
function Tobjnam_read(obj, verb) {
    const nam = xname(obj);
    return `The ${nam} ${vtense(nam, verb)}`;
}

/** C ref: read.c stripspe :652–664 / p_glow1–3 :667–685. */
async function stripspe(obj) {
    if (obj.blessed || (obj.spe | 0) <= 0) {
        await pline(nothing_happens);
        return;
    }
    await pline(`${Yobjnam2_read(obj, 'vibrate')} briefly.`);
    const { costly_alteration } = await import('./shk.js');
    await costly_alteration(obj, COST_UNCHRG);
    obj.spe = 0;
    if ((obj.otyp | 0) === OIL_LAMP || (obj.otyp | 0) === BRASS_LANTERN) obj.age = 0;
}
async function p_glow1(otmp) {
    await pline(`${Yobjnam2_read(otmp, Blind_read() ? 'vibrate' : 'glow')} briefly.`);
}
async function p_glow2(otmp, color, feeble) {
    const blind = Blind_read();
    const glow = Yobjnam2_read(otmp, blind ? 'vibrate' : 'glow');
    const extra = blind ? '' : ` ${hcolor(color)}`;
    await pline(`${glow}${feeble ? ' feebly' : ''}${extra} for a moment.`);
}

/** C ref: read.c wand_explode :2414–2457. */
async function explode_losehp(dmg, how) {
    const { losehp, maybe_half_phys, finish_maybe_wail } = await import('./hack.js');
    losehp(maybe_half_phys(dmg), how, KILLED_BY_AN);
    await finish_maybe_wail();
    if (game._losehp_needs_done || game.program_state?.gameover) {
        const { finish_losehp_done } = await import('./end.js');
        await finish_losehp_done();
    }
}
async function wand_explode(obj, chg) {
    const expl = !chg ? 'suddenly' : 'vibrates violently and';
    if (!chg) chg = 2;
    let n = (obj.spe | 0) + (chg | 0);
    if (n < 2) n = 2;
    const otyp = obj.otyp | 0;
    const k = otyp === WAN_WISHING ? 12
        : (otyp === WAN_CANCELLATION || otyp === WAN_DEATH
            || otyp === WAN_POLYMORPH || otyp === WAN_UNDEAD_TURNING) ? 10
        : (otyp === WAN_COLD || otyp === WAN_FIRE
            || otyp === WAN_LIGHTNING || otyp === WAN_MAGIC_MISSILE) ? 8
        : otyp === WAN_NOTHING ? 4 : 6;
    obj.in_use = true;
    await pline(`${Yname2_read(obj)} ${expl} explodes!`);
    await explode_losehp(d(n, k), 'exploding wand');
    const { useup } = await import('./eat.js');
    useup(obj);
    exercise(A_STR, false);
}

/** C read.c charge_ok :688–724. */
export function charge_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    if (obj.oclass === WAND_CLASS) return GETOBJ_SUGGEST;
    if (obj.oclass === RING_CLASS && otyp_is_charged(obj.otyp | 0)
        && obj.dknown && game.objects?.[obj.otyp | 0]?.oc_name_known) {
        return GETOBJ_SUGGEST;
    }
    if (is_weptool(obj)) return GETOBJ_EXCLUDE;
    if (obj.oclass === TOOL_CLASS) {
        const otyp = obj.otyp | 0;
        if (otyp === BRASS_LANTERN || otyp === OIL_LAMP
            || (otyp === MAGIC_LAMP && !game.objects?.[MAGIC_LAMP]?.oc_name_known)) {
            return GETOBJ_SUGGEST;
        }
        if (otyp_is_charged(otyp)) {
            return (obj.dknown && game.objects?.[otyp]?.oc_name_known)
                ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;
        }
        return GETOBJ_EXCLUDE;
    }
    return GETOBJ_EXCLUDE_SELECTABLE;
}

/** C read.c recharge :726–1008 — curse_bless -1/+1/0; cap_spe at end. */
export async function recharge(obj, curse_bless) {
    if (!obj) return;
    const is_cursed = curse_bless < 0;
    const is_blessed = curse_bless > 0;
    const oc = game.objects?.[obj.otyp | 0];

    if (obj.oclass === WAND_CLASS) {
        const lim = (obj.otyp | 0) === WAN_WISHING ? 1
            : ((oc?.oc_dir | 0) !== NODIR) ? 8 : 15;
        if ((obj.spe | 0) === -1) obj.spe = 0;
        const nprev = obj.recharged | 0;
        if (nprev > 0 && ((obj.otyp | 0) === WAN_WISHING
            || (nprev * nprev * nprev > rn2(7 * 7 * 7)))) {
            await wand_explode(obj, rnd(lim));
            return;
        }
        obj.recharged = nprev + 1;
        if (is_cursed) {
            await stripspe(obj);
        } else {
            let n = (lim === 1) ? 1 : rn1(5, lim + 1 - 5);
            if (!is_blessed) n = rnd(n);
            if ((obj.spe | 0) < n) obj.spe = n;
            else obj.spe = (obj.spe | 0) + 1;
            if ((obj.otyp | 0) === WAN_WISHING && (obj.spe | 0) > 3) {
                await wand_explode(obj, 1);
                return;
            }
            if (lim === 1) await p_glow2(obj, NH_BLUE, true);
            else if ((obj.spe | 0) >= lim) await p_glow2(obj, NH_BLUE);
            else await p_glow1(obj);
        }
    } else if (obj.oclass === RING_CLASS && otyp_is_charged(obj.otyp | 0)) {
        const s = is_blessed ? rnd(3) : is_cursed ? -rnd(2) : 1;
        const u = game.u || {};
        const is_on = obj === u.uleft || obj === u.uright;
        if ((obj.spe | 0) > rn2(7) || (obj.spe | 0) <= -5) {
            await pline(
                `${Yobjnam2_read(obj, 'pulsate')} momentarily, then ${vtense(xname(obj), 'explode')}!`,
            );
            if (is_on) {
                const { Ring_gone } = await import('./do_wear.js');
                await Ring_gone(obj);
            }
            const dmg = rnd(3 * Math.abs(obj.spe | 0));
            const { useup } = await import('./eat.js');
            useup(obj);
            obj = null;
            await explode_losehp(dmg, 'exploding ring');
        } else {
            await pline(
                `${Yname2_read(obj)} spins ${s < 0 ? 'counter' : ''}clockwise for a moment.`,
            );
            if (s < 0) {
                const { costly_alteration } = await import('./shk.js');
                await costly_alteration(obj, COST_DECHNT);
            }
            const mask = is_on ? (obj === u.uleft ? LEFT_RING : RIGHT_RING) : 0;
            if (is_on) {
                const { Ring_off, Ring_on } = await import('./do_wear.js');
                await Ring_off(obj);
                obj.spe = (obj.spe | 0) + s;
                setworn(obj, mask);
                await Ring_on(obj);
            } else {
                obj.spe = (obj.spe | 0) + s;
            }
            if (s > 0 && obj.unpaid) {
                const { alter_cost } = await import('./shk.js');
                alter_cost(obj, 0);
            }
        }
    } else if (obj.oclass === TOOL_CLASS) {
        const rechrg = obj.recharged | 0;
        if (otyp_is_charged(obj.otyp | 0)) {
            if (rechrg < 7) obj.recharged = rechrg + 1;
        }
        switch (obj.otyp | 0) {
        case BELL_OF_OPENING:
            if (is_cursed) await stripspe(obj);
            else obj.spe = (obj.spe | 0) + (is_blessed ? rnd(3) : 1);
            if ((obj.spe | 0) > 5) obj.spe = 5;
            break;
        case MAGIC_MARKER:
        case TINNING_KIT:
        case EXPENSIVE_CAMERA:
            if (is_cursed) {
                await stripspe(obj);
            } else if (rechrg && (obj.otyp | 0) === MAGIC_MARKER) {
                obj.recharged = 1;
                await pline((obj.spe | 0) < 3
                    ? 'Your marker seems permanently dried out.' : nothing_happens);
            } else if (is_blessed) {
                const n = rn1(16, 15);
                const tot = (obj.spe | 0) + n;
                obj.spe = tot <= 50 ? 50 : tot <= 75 ? 75 : Math.min(127, tot);
                await p_glow2(obj, NH_BLUE);
            } else {
                const n = rn1(11, 10);
                const tot = (obj.spe | 0) + n;
                obj.spe = tot <= 50 ? 50 : Math.min(SPE_LIM, tot);
                await p_glow2(obj, NH_WHITE);
            }
            break;
        case OIL_LAMP:
        case BRASS_LANTERN:
            if (is_cursed) {
                await stripspe(obj);
                if (obj.lamplit) {
                    if (!Blind_read()) await pline(`${Tobjnam_read(obj, 'go')} out!`);
                    const { end_burn } = await import('./timeout.js');
                    end_burn(obj, true);
                }
            } else if (is_blessed) {
                obj.spe = 1; obj.age = 1500;
                await p_glow2(obj, NH_BLUE);
            } else {
                obj.spe = 1;
                obj.age = Math.min(1500, (obj.age | 0) + 750);
                await p_glow1(obj);
            }
            break;
        case CRYSTAL_BALL:
            if ((obj.spe | 0) === -1) obj.spe = 0;
            if (is_cursed) {
                if (!obj.cursed) {
                    await p_glow2(obj, NH_BLACK);
                    curse(obj);
                } else {
                    await pline(`${Yobjnam2_read(obj, 'vibrate')} briefly.`);
                }
                if ((obj.spe | 0) > 0) {
                    const { costly_alteration } = await import('./shk.js');
                    await costly_alteration(obj, COST_UNCHRG);
                }
                obj.spe = 0;
            } else if (is_blessed) {
                obj.spe = 7;
                await p_glow2(obj, !obj.blessed ? NH_LIGHT_BLUE : NH_BLUE);
                if (!obj.blessed) bless(obj);
            } else if ((obj.spe | 0) < 7 || obj.cursed) {
                obj.spe = Math.min((obj.spe | 0) + rnd(2), 7);
                if (!obj.cursed) await p_glow1(obj);
                else {
                    await p_glow2(obj, NH_AMBER);
                    uncurse(obj);
                }
            } else {
                await pline(nothing_happens);
            }
            break;
        case HORN_OF_PLENTY:
        case BAG_OF_TRICKS:
        case CAN_OF_GREASE:
            if (is_cursed) await stripspe(obj);
            else if (is_blessed) {
                obj.spe = (obj.spe | 0) + ((obj.spe | 0) <= 10 ? rn1(10, 6) : rn1(5, 6));
                if ((obj.spe | 0) > 50) obj.spe = 50;
                await p_glow2(obj, NH_BLUE);
            } else {
                obj.spe = (obj.spe | 0) + rn1(5, 2);
                if ((obj.spe | 0) > 50) obj.spe = 50;
                await p_glow1(obj);
            }
            break;
        case MAGIC_FLUTE:
        case MAGIC_HARP:
        case FROST_HORN:
        case FIRE_HORN:
        case DRUM_OF_EARTHQUAKE:
            if (is_cursed) await stripspe(obj);
            else if (is_blessed) {
                obj.spe = (obj.spe | 0) + d(2, 4);
                if ((obj.spe | 0) > 20) obj.spe = 20;
                await p_glow2(obj, NH_BLUE);
            } else {
                obj.spe = (obj.spe | 0) + rnd(4);
                if ((obj.spe | 0) > 20) obj.spe = 20;
                await p_glow1(obj);
            }
            break;
        default:
            await pline('You have a feeling of loss.');
            break;
        }
    } else {
        await pline('You have a feeling of loss.');
    }
    if (obj) cap_spe(obj);
}

/** C read.c maybe_tame :1043–1063. */
async function maybe_tame(mtmp, sobj) {
    const was_tame = mtmp.mtame | 0;
    const was_peaceful = mtmp.mpeaceful | 0;
    if (sobj.cursed) {
        setmangry(mtmp, false);
        if (was_peaceful && !mtmp.mpeaceful) return -1;
    } else {
        const { resist } = await import('./zap.js');
        if (!(await resist(mtmp, sobj.oclass | 0, 0, NOTELL)) || mtmp.isshk) {
            const { tamedog } = await import('./dog.js');
            await tamedog(mtmp, sobj, false);
        }
        if ((!was_peaceful && mtmp.mpeaceful) || was_tame !== (mtmp.mtame | 0)) {
            return 1;
        }
    }
    return 0;
}

/** C read.c seffect_taming :1679–1719 — 3x3 (confused 11x11) / swallow. */
async function seffect_taming(sobj) {
    const u = game.u || {};
    const confused = !!(u.HConfusion | 0);
    let candidates = 0;
    let results = 0;
    let vis_results = 0;
    if (u.uswallow) {
        candidates = 1;
        const res = await maybe_tame(u.ustuck, sobj);
        results = vis_results = res;
    } else {
        const bd = confused ? 5 : 1;
        const ux = u.ux | 0;
        const uy = u.uy | 0;
        for (let i = -bd; i <= bd; i++) {
            for (let j = -bd; j <= bd; j++) {
                if (!isok(ux + i, uy + j)) continue;
                let mtmp = m_at(ux + i, uy + j);
                if (!mtmp && !i && !j) mtmp = u.usteed || null;
                if (!mtmp) continue;
                candidates++;
                const res = await maybe_tame(mtmp, sobj);
                results += res;
                if (canspotmon(mtmp)) vis_results += res;
            }
        }
    }
    if (!results) {
        await pline(`Nothing interesting ${!candidates ? 'happens' : 'seems to happen'}.`);
    } else {
        await pline(
            `The neighborhood ${vis_results ? 'is' : 'seems'} ${results < 0 ? 'un' : ''}friendlier.`,
        );
        if (vis_results > 0) known = true;
    }
}

/**
 * C ref: objnam.c erosion_matters — weapon/armor/ball/chain; tools if weptool.
 * Local copy to avoid exporting from mkobj (weptool name list matches).
 */
function erosion_matters_obj(otmp) {
    if (!otmp) return false;
    const c = otmp.oclass;
    if (c === WEAPON_CLASS || c === ARMOR_CLASS) return true;
    // BALL/CHAIN / weptool deferred for enchant-weapon confused proof path
    return false;
}

/**
 * C ref: read.c seffect_enchant_weapon
 * Confused: erodeproof/unproof uwep (non-armor). Else chwepon(s) + cap_spe.
 * Deferred: twoweapon secondary choice; confused Yobjnam2/hcolor Blind polish;
 * shop costly_alteration on proof strip.
 * @returns {Promise<object|null>} sobj or null if strange_feeling used it up
 */
async function seffect_enchant_weapon(sobj) {
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!(game.u?.Confusion);
    const u = game.u || {};
    const uwep = u.uwep;
    const Blind = !!(u.Blind || u.ublind);

    if (confused && uwep
        && erosion_matters_obj(uwep) && uwep.oclass !== ARMOR_CLASS) {
        const old_erodeproof = !!uwep.oerodeproof;
        const new_erodeproof = !scursed;
        uwep.oerodeproof = 0;
        if (Blind) {
            uwep.rknown = 0;
            await pline('Your weapon feels warm for a moment.');
        } else {
            uwep.rknown = 1;
            // Yobjnam2 / hcolor NH_PURPLE|GOLDEN polish deferred
            await pline(
                `Your ${uwep.quan > 1 ? 'weapons are' : 'weapon is'} covered by a ${
                    scursed ? 'mottled' : 'shimmering'
                } ${scursed ? 'purple' : 'golden'} ${scursed ? 'glow' : 'shield'}!`,
            );
        }
        if (new_erodeproof && ((uwep.oeroded | 0) || (uwep.oeroded2 | 0))) {
            uwep.oeroded = 0;
            uwep.oeroded2 = 0;
            await pline(
                Blind
                    ? 'Your weapon feels as good as new!'
                    : 'Your weapon looks as good as new!',
            );
        }
        if (old_erodeproof && !new_erodeproof) {
            uwep.oerodeproof = 1;
            // costly_alteration COST_DEGRD deferred
        }
        uwep.oerodeproof = new_erodeproof ? 1 : 0;
        return sobj;
    }

    // C: s = scursed ? -1 : !uwep ? 1 : spe>=9 ? (rn2(spe)==0)
    //      : sblessed ? rnd(3 - spe/3) : 1
    let s;
    if (scursed) {
        s = -1;
    } else if (!uwep) {
        s = 1;
    } else if ((uwep.spe | 0) >= 9) {
        s = rn2(uwep.spe | 0) === 0 ? 1 : 0;
    } else if (sblessed) {
        s = rnd(3 - ((uwep.spe | 0) / 3 | 0));
    } else {
        s = 1;
    }

    if (!(await chwepon(sobj, s))) {
        return null; // strange_feeling already useup'd
    }
    if (uwep) cap_spe(uwep);
    return sobj;
}

/**
 * C ref: potion.c strange_feeling — local for destroy-armor fail / confused naked.
 */
async function strange_feeling_scroll(obj, txt) {
    const beginner = !!(game.flags?.beginner);
    const Hallucination = !!(game.u?.Hallucination);
    if (beginner || !txt) {
        await pline(
            `You have a ${Hallucination ? 'normal' : 'strange'} feeling for a moment, then it passes.`,
        );
    } else {
        await pline(txt);
    }
    if (!obj) return;
    if (obj.dknown) await trycall(obj);
    useup(obj);
}

/**
 * C ref: read.c seffect_destroy_armor
 * Envelope: some_armor always; uncursed non-confused → destroy_arm (or
 * strange_feeling + STR/CON exercise on fail). Named omissions: confused
 * p_glow2 polish; cursed vibrate adj_abon + make_stunned body;
 * disintegrate_arm; blessed getobj choice + disintegrate_cursed_armor.
 * @returns {Promise<object|null>} sobj or null if strange_feeling used it up
 */
async function seffect_destroy_armor(sobj) {
    // C: always picks some_armor first (may rn2(4) per extra worn slot)
    const otmp = some_armor(null);
    const scursed = !!sobj.cursed;
    const confused = !!(game.u?.Confusion);

    if (confused) {
        if (!otmp) {
            await strange_feeling_scroll(sobj, 'Your bones itch.');
            exercise(A_STR, false);
            exercise(A_CON, false);
            return null;
        }
        // Confused erodeproof toggle (p_glow2 deferred → plain pline)
        const old_erodeproof = !!otmp.oerodeproof;
        const new_erodeproof = scursed;
        otmp.oerodeproof = 0;
        await pline(`Your ${xname(otmp)} glows purple for a moment.`);
        if (old_erodeproof && !new_erodeproof) {
            otmp.oerodeproof = 1;
            // costly_alteration COST_DEGRD deferred
        }
        otmp.oerodeproof = new_erodeproof ? 1 : 0;
        return sobj;
    }

    if (scursed) {
        // vibrate / disintegrate_arm deferred — seed path is uncursed
        if (otmp && otmp.cursed) {
            await pline(`Your ${xname(otmp)} vibrates.`);
            if ((otmp.spe | 0) >= -6) {
                otmp.spe = (otmp.spe | 0) - 1;
                // adj_abon deferred
            }
            // make_stunned((HStun & TIMEOUT) + rn1(10,10)) deferred
        }
        // else disintegrate_arm deferred
        return sobj;
    }

    // Uncursed: blessed choice / disintegrate_cursed deferred
    if (!(await destroy_arm())) {
        await strange_feeling_scroll(sobj, 'Your skin itches.');
        exercise(A_STR, false);
        exercise(A_CON, false);
        return null;
    }
    known = true;
    return sobj;
}

/**
 * C ref: read.c seffect_identify.
 * Scroll: useup first, self-ID messages, learnscrolltyp, then
 * identify_pack(cval). SPE_IDENTIFY cast path deferred (wired if seffects).
 */
async function seffect_identify(sobj) {
    const otyp = sobj.otyp | 0;
    const is_scroll = sobj.oclass === SCROLL_CLASS;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const u = game.u || {};
    const confused = !!(u.HConfusion || u.Confusion);
    const already_known = sobj.oclass === SPBOOK_CLASS
        || !!game.objects?.[otyp]?.oc_name_known;

    if (is_scroll) {
        useup(sobj);
        // scroll gone — caller must not useup again
        if (confused || (scursed && !already_known)) {
            await pline('You identify this as an identify scroll.');
        } else if (!already_known) {
            await pline('This is an identify scroll.');
        }
        if (!already_known) learnscrolltyp(SCR_IDENTIFY);
        if (confused || (scursed && !already_known)) return null;
    }

    const invent = game.invent || [];
    if (invent.length) {
        let cval = 1;
        if (sblessed || (!scursed && !rn2(5))) {
            cval = rn2(5);
            // note: if cval==0, identify all items
            if (cval === 1 && sblessed && ((u.uluck | 0) > 0)) {
                ++cval;
            }
        }
        await identify_pack(cval, !already_known);
    } else {
        await pline(
            `You're not carrying anything${is_scroll ? ' else' : ''} to be identified.`,
        );
    }
    return null; // used up when scroll
}

/**
 * C ref: read.c unpunish — remove ball & chain (chain destroyed, ball freed).
 * Named omissions: delobj newsym / monster-under-chain polish.
 */
export function unpunish() {
    const u = game.u || (game.u = {});
    const savechain = u.uchain;
    setworn(null, W_CHAIN); // clears uchain
    if (savechain) delobj(savechain);
    setworn(null, W_BALL); // clears uball; ball persists if carried/floor
}

/**
 * C ref: read.c punish — attach ball & chain (or weight existing ball).
 * Named omissions: Blind set_bc; flooreffects via placebc; angrygods
 * HEAVY_IRON_BALL reuse when sobj is already the ball.
 */
export async function punish(sobj) {
    const u = game.u || (game.u = {});
    const reuse_ball = (sobj && sobj.otyp === HEAVY_IRON_BALL) ? sobj : null;
    const cursed_levy = (sobj && sobj.cursed) ? 1 : 0;

    // C: Punished ≡ (uball != 0)
    if (u.uball) {
        if (!reuse_ball) {
            await pline('You are being punished for your misbehavior!');
        }
        await pline('Your iron ball gets heavier.');
        u.uball.owt = (u.uball.owt | 0) + WT_IRON_BALL_INCR * (1 + cursed_levy);
        return;
    }

    if (!reuse_ball) {
        await pline('You are being punished for your misbehavior!');
    }

    const youdat = game.youmonst?.data;
    if (amorphous(youdat) || is_whirly(youdat) || unsolid(youdat)) {
        if (!reuse_ball) {
            await pline('A ball and chain appears, then falls away.');
            await dropy(mkobj(BALL_CLASS, true));
        } else {
            await dropy(reuse_ball);
        }
        return;
    }

    setworn(mkobj(CHAIN_CLASS, true), W_CHAIN);
    if (!reuse_ball) setworn(mkobj(BALL_CLASS, true), W_BALL);
    else setworn(reuse_ball, W_BALL);

    if (!u.uswallow) {
        placebc();
        // Blind set_bc deferred
        newsym(u.ux | 0, u.uy | 0);
    }
}

/**
 * C ref: read.c seffect_punishment
 */
async function seffect_punishment(sobj) {
    const sblessed = !!sobj.blessed;
    const confused = !!(game.u?.HConfusion || game.u?.Confusion);
    known = true;
    if (confused || sblessed) {
        await You_feel('guilty.');
        return;
    }
    await punish(sobj);
}

/**
 * C ref: read.c seffect_genocide.
 * Blessed → do_class_genocide; else do_genocide((!cursed)|(2*!!Confusion)).
 * C youprop.h: Confusion ≡ HConfusion (D-1048). Named omissions:
 * livelog; Hallucination type names; vampshifted POLY_REVERT;
 * chameleon newcham; update_inventory.
 */
async function seffect_genocide(sobj) {
    const otyp = sobj.otyp | 0;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const already_known = sobj.oclass === SPBOOK_CLASS
        || !!game.objects?.[otyp]?.oc_name_known;
    if (!already_known) {
        await pline('You have found a scroll of genocide!');
    }
    known = true;
    if (sblessed) {
        await do_class_genocide();
    } else {
        // C: (!scursed) | (2 * !!Confusion)
        const confused = !!(game.u?.HConfusion | 0);
        await do_genocide((scursed ? 0 : 1) | (2 * (confused ? 1 : 0)));
    }
}

/**
 * C ref: read.c seffect_create_monster `:1608–1624`.
 * create_critters(1 + ((confused||scursed)?12:0)
 *   + ((sblessed||rn2(73))?0:rnd(4)),
 *   confused ? &mons[PM_ACID_BLOB] : NULL, FALSE)
 * then gk.known iff a spawned monster is seen.
 * Callers: seffects SCR_CREATE_MONSTER / SPE_CREATE_MONSTER
 * (spell.c spelleffects D-1401). Confusion ≡ HConfusion (D-1048).
 */
async function seffect_create_monster(sobj) {
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const u = game.u || {};
    const confused = !!(u.HConfusion | 0);
    const cnt = 1
        + ((confused || scursed) ? 12 : 0)
        + ((sblessed || rn2(73)) ? 0 : rnd(4));
    const mptr = confused ? mons(PM_ACID_BLOB) : null;
    if (await create_critters(cnt, mptr, false)) {
        known = true;
    }
}

/**
 * C ref: read.c seffects — oc_magic exercise + otyp dispatch.
 * @returns {number} 0 = caller useup/learn; 1 = already used up;
 *   -1 = unimplemented (caller must not useup)
 */
export async function seffects(sobj) {
    const otyp = sobj.otyp;
    const oc = game.objects?.[otyp];

    // C: exercise before switch for any oc_magic
    if (oc?.oc_magic) exercise(A_WIS, true);

    switch (otyp) {
    case SCR_MAGIC_MAPPING:
    case SPE_MAGIC_MAPPING:
        await seffect_magic_mapping(sobj);
        break;
    case SCR_TELEPORTATION:
        await seffect_teleportation(sobj);
        break;
    case SCR_LIGHT:
        await seffect_light(sobj);
        break;
    case SCR_REMOVE_CURSE:
    case SPE_REMOVE_CURSE:
        await seffect_remove_curse(sobj);
        break;
    case SCR_IDENTIFY: {
        const kept = await seffect_identify(sobj);
        if (!kept) return 1;
        break;
    }
    case SCR_ENCHANT_WEAPON: {
        const kept = await seffect_enchant_weapon(sobj);
        if (!kept) return 1;
        break;
    }
    case SCR_DESTROY_ARMOR: {
        const kept = await seffect_destroy_armor(sobj);
        if (!kept) return 1;
        break;
    }
    case SCR_PUNISHMENT:
        await seffect_punishment(sobj);
        break;
    case SCR_GENOCIDE:
        await seffect_genocide(sobj);
        break;
    case SCR_CREATE_MONSTER:
    case SPE_CREATE_MONSTER:
        await seffect_create_monster(sobj);
        break;
    case SCR_TAMING:
    case SPE_CHARM_MONSTER:
        await seffect_taming(sobj);
        break;
    default:
        // Other seffect_* deferred — do not useup
        await pline('That scroll is not implemented yet.');
        return -1;
    }
    // sobj gone → 1; still present → 0 (caller useup)
    return sobj ? 0 : 1;
}

/**
 * C ref: read.c doread / #read ('r')
 * @returns {Promise<number>} 0 = cancel/no turn, 1 = took time
 */
export async function doread() {
    known = false;
    // C ref: hack.c check_capacity — near_capacity >= EXT_ENCUMBER → ECMD_OK
    if (near_capacity() >= EXT_ENCUMBER) {
        await pline("You can't do that while carrying so much stuff.");
        return 0;
    }

    const scroll = await getobj_read();
    if (!scroll) return 0;

    const otyp = scroll.otyp;
    // cookie / shirt / credit / marker / coin / orb / candy deferred

    if (scroll.oclass !== SCROLL_CLASS && scroll.oclass !== SPBOOK_CLASS) {
        await pline('That is a silly thing to read.');
        return 0;
    }

    // Blind formula gates deferred (starting Wizard not Blind)

    // C: literate conduct before SPBOOK study_book (exclude Dead/novel/blank)
    if (otyp !== SPE_BOOK_OF_THE_DEAD && otyp !== SPE_NOVEL
        && otyp !== SPE_BLANK_PAPER && otyp !== SCR_BLANK_PAPER) {
        if (!game.u) game.u = {};
        if (!game.u.uconduct) game.u.uconduct = {};
        game.u.uconduct.literate = (game.u.uconduct.literate | 0) + 1;
        // livelog deferred
    }

    if (scroll.oclass === SPBOOK_CLASS) {
        // C: return study_book(scroll) ? ECMD_TIME : ECMD_OK
        return (await study_book(scroll)) ? 1 : 0;
    }

    // Gate unported scroll otyps before disappear/useup (C would seffect)
    if (otyp !== SCR_MAGIC_MAPPING && otyp !== SCR_BLANK_PAPER
        && otyp !== SCR_TELEPORTATION && otyp !== SCR_LIGHT
        && otyp !== SCR_REMOVE_CURSE && otyp !== SCR_ENCHANT_WEAPON
        && otyp !== SCR_DESTROY_ARMOR && otyp !== SCR_IDENTIFY
        && otyp !== SCR_PUNISHMENT && otyp !== SCR_GENOCIDE
        && otyp !== SCR_CREATE_MONSTER) {
        await pline('That scroll is not implemented yet.');
        return 0;
    }

    scroll.in_use = true;
    if (otyp !== SCR_BLANK_PAPER) {
        const u = game.u || {};
        // C: Confusion != 0; Blind; can_chant → silently
        const confused = !!(u.HConfusion || u.Confusion);
        const Blind = !!(u.Blind || u.ublind);
        const silently = !can_chant();
        // C: nodisappear for SCR_FIRE / cursed SCR_REMOVE_CURSE
        const nodisappear = (otyp === SCR_REMOVE_CURSE && !!scroll.cursed);
        if (Blind) {
            const verb = silently ? 'cogitate' : 'pronounce';
            await pline(
                nodisappear
                    ? `You ${verb} the formula on the scroll.`
                    : `As you ${verb} the formula on it, the scroll disappears.`,
            );
        } else {
            await pline(
                nodisappear
                    ? 'You read the scroll.'
                    : 'As you read the scroll, it disappears.',
            );
        }
        // C ref: read.c doread — confused pline before seffects (D-0580)
        if (confused) {
            if (u.HHallucination || u.Hallucination) {
                await pline('Being so trippy, you screw up...');
            } else {
                await pline(
                    `Being confused, you ${silently ? 'misunderstand' : 'mispronounce'} the magic words...`,
                );
            }
        }
    }

    const sr = await seffects(scroll);
    if (sr < 0) {
        scroll.in_use = false;
        return 0;
    }
    if (!sr) {
        const oc = game.objects?.[otyp];
        if (oc && !oc.oc_name_known) {
            if (known) learnscroll(scroll);
            else await trycall(scroll);
        }
        scroll.in_use = false;
        if (otyp !== SCR_BLANK_PAPER) useup(scroll);
    }
    return 1;
}

const GENO_REALLY = 1;
const GENO_PLAYER = 2;
const GENO_ONTHRONE = 4;
const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');

function strcmpi_eq(a, b) {
    return String(a).toLowerCase() === String(b).toLowerCase();
}

function sgn(n) {
    const x = n | 0;
    return (x > 0) - (x < 0);
}

function Your_Own_Role(mndx) {
    return (mndx | 0) === (game.urole?.mnum | 0);
}

function Your_Own_Race(mndx) {
    return (mndx | 0) === (game.urace?.mnum | 0);
}

function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

function wizard_mode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

function Unchanging() {
    const u = game.u || {};
    const p = u.uprops?.[UNCHANGING];
    return !!((u.HUnchanging | 0) || (u.EUnchanging | 0) || u.Unchanging
        || p?.intrinsic || p?.extrinsic);
}

function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

/** C ref: questpgr.c quest_info — urole ldr/nemi/guard/questarti. */
function quest_info(typ) {
    const urole = game.urole || {};
    if (typ === 0) return urole.questarti | 0;
    if (typ === MS_LEADER) return urole.ldrnum ?? NON_PM;
    if (typ === MS_NEMESIS) return urole.neminum ?? NON_PM;
    if (typ === MS_GUARDIAN) return urole.guardnum ?? NON_PM;
    return 0;
}

function type_is_pname_ptr(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_PNAME);
}

function upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** C ref: polyself.c udeadinside — dead / condemned / empty. */
function udeadinside() {
    const data = game.youmonst?.data;
    if (!nonliving(data)) return 'dead';
    if (!weirdnonliving(data)) return 'condemned';
    return 'empty';
}

function ensure_mvitals(mndx) {
    if (!game.mvitals) game.mvitals = [];
    if (!game.mvitals[mndx]) {
        game.mvitals[mndx] = { mvflags: 0, born: 0, died: 0 };
    }
    return game.mvitals[mndx];
}

const MS_LEADER = 36;
const MS_NEMESIS = 37;
const MS_GUARDIAN = 38;
const PM_NINJA = monsterNames.indexOf('PM_NINJA');
const PM_SAMURAI = monsterNames.indexOf('PM_SAMURAI');

/**
 * C ref: read.c do_class_genocide — blessed SCR_GENOCIDE class wipe.
 * Named omissions: livelog; vampshifted POLY_REVERT; update_inventory.
 */
async function do_class_genocide() {
    const u = game.u || (game.u = {});
    let feel_dead = 0;
    let gameover = false;

    for (let j = 0; ; j++) {
        if (j >= 5) {
            await pline(thats_enough_tries);
            return;
        }
        let promptbuf = 'What class of monsters do you want to genocide?';
        if (j > 0) {
            promptbuf += game.iflags?.cmdassist
                ? " [enter the symbol or name representing a class, or '?']"
                : " [enter '?' to see previous genocides]";
        }
        const buf = mungspaces(await getlin(promptbuf));
        if (!buf) {
            await pline(
                (j + 1 < 5)
                    ? 'Type letter (or punctuation) or name used for a class of monsters or \'none\'.'
                    : 'No class of monsters specified.',
            );
            continue;
        }
        if (buf === '\x1b' || strcmpi_eq(buf, 'none')
            || strcmpi_eq(buf, "'none'") || strcmpi_eq(buf, 'nothing')) {
            return;
        }
        if (buf === '?' || buf === "'?'") {
            const { list_genocided } = await import('./insight.js');
            await list_genocided('g', false);
            j--;
            continue;
        }

        let monclass = name_to_monclass(buf);
        if (!monclass) {
            const i = name_to_mon(buf);
            if (i !== NON_PM && i >= 0) monclass = mons(i)?.mlet || 0;
        }
        let immunecnt = 0;
        let gonecnt = 0;
        let goodcnt = 0;
        for (let i = LOW_PM; i < NUMMONS; i++) {
            if (mons(i)?.mlet !== monclass) continue;
            if (!((mons(i).geno | 0) & G_GENO)) immunecnt++;
            else if (((game.mvitals?.[i]?.mvflags ?? 0) & G_GENOD) !== 0) {
                gonecnt++;
            } else goodcnt++;
        }
        const role_let = mons(game.urole?.mnum)?.mlet;
        const race_let = mons(game.urace?.mnum)?.mlet;
        if (!goodcnt && monclass !== role_let && monclass !== race_let) {
            if (gonecnt) {
                await pline('All such monsters are already nonexistent.');
            } else if (immunecnt || monclass === 'S_invisible') {
                await pline("You aren't permitted to genocide such monsters.");
            } else if (wizard_mode() && buf.charAt(0) === '*') {
                gonecnt = 0;
                for (const mtmp of (game.fmon || []).slice()) {
                    if ((mtmp.mhp | 0) <= 0) continue;
                    await mongone(mtmp);
                    gonecnt++;
                }
                await pline(
                    `Eliminated ${gonecnt} monster${gonecnt === 1 ? '' : 's'}.`,
                );
                return;
            } else {
                await pline(
                    `That ${buf.length === 1 ? 'symbol' : 'response'} does not represent any monster.`,
                );
            }
            continue;
        }

        for (let i = LOW_PM; i < NUMMONS; i++) {
            if (mons(i)?.mlet !== monclass) continue;
            const nam = makeplural(pmnames[i]?.[NEUTRAL] || 'creature');
            const mv = (game.mvitals?.[i]?.mvflags ?? 0);
            if (Your_Own_Role(i) || Your_Own_Race(i)
                || (((mons(i).geno | 0) & G_GENO) && !(mv & G_GENOD))) {
                ensure_mvitals(i).mvflags =
                    (ensure_mvitals(i).mvflags | 0) | G_GENOD | G_NOCORPSE;
                kill_genocided_monsters();
                await pline(`Wiped out all ${nam}.`);
                // vampshifted POLY_REVERT deferred
                if (Upolyd(u) && i === (u.umonnum | 0)) {
                    u.mh = -1;
                    if (Unchanging()) {
                        if (!feel_dead++) await urgent_pline('You die.');
                        gameover = true;
                    } else {
                        const { rehumanize } = await import('./polyself.js');
                        await rehumanize();
                    }
                }
                if (i === (game.urole?.mnum | 0)
                    || i === (game.urace?.mnum | 0)) {
                    u.uhp = -1;
                    if (Upolyd(u)) {
                        if (!feel_dead++) {
                            await You_feel(`${udeadinside()} inside.`);
                        }
                    } else {
                        if (!feel_dead++) await urgent_pline('You die.');
                        gameover = true;
                    }
                }
            } else if (mv & G_GENOD) {
                if (!gameover) {
                    await pline(`${upstart(nam)} are already nonexistent.`);
                }
            } else if (!gameover) {
                const ptr = mons(i);
                const ms = ptr.msound | 0;
                if ((ms !== MS_LEADER || quest_info(MS_LEADER) === i)
                    && (ms !== MS_NEMESIS || quest_info(MS_NEMESIS) === i)
                    && (ms !== MS_GUARDIAN || quest_info(MS_GUARDIAN) === i)
                    && (i !== PM_NINJA || Role_if(PM_SAMURAI))) {
                    const named = type_is_pname_ptr(ptr);
                    let uniq = !!((ptr.geno | 0) & G_UNIQ);
                    if (i === PM_HIGH_CLERIC) uniq = false;
                    await pline(
                        `You aren't permitted to genocide ${uniq && !named ? 'the ' : ''}${uniq || named ? (pmnames[i]?.[NEUTRAL] || nam) : nam}.`,
                    );
                }
            }
        }
        if (gameover || u.uhp === -1) {
            if (!game.killer) game.killer = { name: '', format: 0 };
            game.killer.format = KILLED_BY_AN;
            game.killer.name = 'scroll of genocide';
            if (gameover) await done(GENOCIDED);
        }
        return;
    }
}

/**
 * C ref: read.c do_genocide(how).
 * how: 0 = cursed spawn; 1 = REALLY; 3 = REALLY|PLAYER; 5 = REALLY|ONTHRONE.
 * Named omissions: livelog; Hallucination type names; vampshifted
 * POLY_REVERT; chameleon newcham; update_inventory.
 */
export async function do_genocide(how) {
    const u = game.u || (game.u = {});
    let killplayer = 0;
    let mndx = NON_PM;
    let ptr = null;

    if (how & GENO_PLAYER) {
        mndx = u.umonster | 0;
        ptr = mons(mndx);
        killplayer++;
    } else {
        for (let i = 0; ; i++) {
            if (i >= 5) {
                if (!(how & GENO_REALLY)) {
                    ptr = rndmonst();
                    if (ptr) break;
                }
                await pline(thats_enough_tries);
                return;
            }
            let promptbuf = 'What type of monster do you want to genocide?';
            if (i > 0) {
                promptbuf += game.iflags?.cmdassist
                    ? " [enter the name of a type of monster, or '?']"
                    : " [enter '?' to see previous genocides]";
            }
            let buf = mungspaces(await getlin(promptbuf));
            if (!buf) {
                await pline(
                    (i + 1 < 5)
                        ? 'Type the name of a type of monster or \'none\'.'
                        : 'No type of monster specified.',
                );
                continue;
            }
            if (buf === '\x1b' || strcmpi_eq(buf, 'none')
                || strcmpi_eq(buf, "'none'") || strcmpi_eq(buf, 'nothing')) {
                if (!(how & GENO_REALLY)) {
                    ptr = rndmonst();
                    if (ptr) break;
                }
                return;
            }
            if (buf === '?' || buf === "'?'") {
                const { list_genocided } = await import('./insight.js');
                await list_genocided('g', false);
                i--;
                continue;
            }

            mndx = name_to_mon(buf);
            if (mndx === NON_PM || mndx < 0
                || (((game.mvitals?.[mndx]?.mvflags ?? 0) & G_GENOD) !== 0)) {
                await pline(
                    `Such creatures ${mndx === NON_PM || mndx < 0 ? 'do not' : 'no longer'} exist in this world.`,
                );
                continue;
            }
            ptr = mons(mndx);
            // vampshifted POLY_REVERT deferred
            if (Your_Own_Role(mndx) || Your_Own_Race(mndx)) {
                killplayer++;
                break;
            }
            if (is_human(ptr)) adjalign(-sgn(u.ualign?.type | 0));
            if (is_demon(ptr)) adjalign(sgn(u.ualign?.type | 0));

            if (!((ptr.geno | 0) & G_GENO)) {
                if (!Deaf()) {
                    if (game.flags?.verbose !== false) {
                        await pline('A thunderous voice booms through the caverns:');
                    }
                    await verbalize('No, mortal!  That will not be done.');
                }
                continue;
            }
            const Unchanging = !!(u.Unchanging || u.HUnchanging || u.EUnchanging);
            if (Unchanging
                && (ptr.mndx | 0) === (game.youmonst?.data?.mndx | 0)) {
                killplayer++;
            }
            break;
        }
        mndx = ptr?.mndx ?? mndx;
    }

    if (!ptr) return;

    let which = 'all ';
    const realbuf = pmnames[mndx]?.[NEUTRAL] || ptr.name || 'creature';
    // Hallucination type names deferred — use actual type
    let buf = realbuf;
    if (((ptr.geno | 0) & G_UNIQ) && mndx !== PM_HIGH_CLERIC) {
        which = !((ptr.mflags2 | 0) & M2_PNAME) ? 'the ' : '';
    }

    if (how & GENO_REALLY) {
        if (!game.mvitals) game.mvitals = [];
        if (!game.mvitals[mndx]) {
            game.mvitals[mndx] = { mvflags: 0, born: 0, died: 0 };
        }
        game.mvitals[mndx].mvflags =
            (game.mvitals[mndx].mvflags | 0) | G_GENOD | G_NOCORPSE;
        await pline(
            `Wiped out ${which}${which.charAt(0) !== 'a' ? buf : makeplural(buf)}.`,
        );

        if (killplayer) {
            u.uhp = -1;
            if (!game.killer) game.killer = { name: '', format: 0 };
            if (how & GENO_PLAYER) {
                game.killer.format = KILLED_BY;
                game.killer.name = 'genocidal confusion';
            } else if (how & GENO_ONTHRONE) {
                game.killer.format = KILLED_BY_AN;
                game.killer.name = 'imperious order';
            } else {
                game.killer.format = KILLED_BY_AN;
                game.killer.name = 'scroll of genocide';
            }
            if (Upolyd(u)
                && (ptr.mndx | 0) !== (game.youmonst?.data?.mndx | 0)) {
                // delayed_killer(POLYMORPH) + udeadinside deferred
                await You_feel('dead inside.');
            } else {
                await done(GENOCIDED);
            }
        } else if ((ptr.mndx | 0) === (game.youmonst?.data?.mndx | 0)) {
            const { rehumanize } = await import('./polyself.js');
            await rehumanize();
        }
        kill_genocided_monsters();
        // update_inventory deferred
    } else {
        let cnt = 0;
        const { monster_census } = await import('./minion.js');
        const census = monster_census(false);
        if (!((mons(mndx)?.geno | 0) & G_UNIQ)
            && !(((game.mvitals?.[mndx]?.mvflags ?? 0) & (G_GENOD | G_EXTINCT)))) {
            for (let i = rn1(3, 4); i > 0; i--) {
                if (!makemon(ptr, u.ux | 0, u.uy | 0, NO_MINVENT | MM_NOMSG)) {
                    break;
                }
                cnt++;
                if (((game.mvitals?.[mndx]?.mvflags ?? 0) & G_EXTINCT) !== 0) {
                    break;
                }
            }
        }
        if (cnt) {
            cnt = monster_census(false) - census;
            await pline(
                `Sent in ${cnt > 1 ? 'some ' : ''}${cnt > 1 ? makeplural(buf) : an(buf)}.`,
            );
        } else {
            await pline(nothing_happens);
        }
    }
}

function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

/**
 * C ref: read.c create_particular_parse — named-monster subset.
 * Envelope: name_to_mon only. Deferred: quan digit prefix, saddled/
 * sleeping/invisible/hidden/female/male/tame/peaceful/hostile,
 * * / random, name_to_monclass class letters.
 * @returns {object|null}
 */
function create_particular_parse(str) {
    const bufp = mungspaces(str);
    if (!bufp) return null;
    const which = name_to_mon(bufp);
    if (which === NON_PM || which < 0) return null;
    return {
        quan: 1 + ((game.multi > 0) ? (game.multi | 0) : 0),
        which,
        fem: -1,
        genderconf: -1,
        randmonst: false,
        monclass: -1, // C MAXMCLASSES — named path
    };
}

/**
 * C ref: read.c create_particular_creation — named MM_NOEXCLAM path.
 * C has no caller pline; appear is makemon.c !MM_NOMSG Norep. Sync
 * makemon + await makemon_appear_msg (async pline boundary).
 */
async function create_particular_creation(d) {
    if (!d || d.randmonst) return false;
    const whichpm = mons(d.which);
    if (!whichpm) return false;
    let madeany = false;
    const ux = game.u.ux | 0;
    const uy = game.u.uy | 0;
    for (let i = 0; i < d.quan; i++) {
        const mmflags = NO_MM_FLAGS | MM_NOEXCLAM;
        const mtmp = makemon(whichpm, ux, uy, mmflags);
        if (!mtmp) break;
        await makemon_appear_msg(mtmp, ux, uy, mmflags);
        madeany = true;
    }
    return madeany;
}

/**
 * C ref: read.c create_particular — wizard ^G / #wizgenesis getlin loop.
 * Envelope: named monster via name_to_mon + makemon(u.ux,u.uy,MM_NOEXCLAM).
 */
export async function create_particular() {
    const CP_TRYLIM = 5;
    let tryct = CP_TRYLIM;
    let altmsg = 0;
    let prompt = 'Create what kind of monster?';
    let d = null;
    do {
        const buf = await getlin(prompt);
        if (buf === '\x1b') return false;
        const bufp = mungspaces(buf);
        if (bufp === '\x1b') return false;
        d = create_particular_parse(bufp);
        if (d) break;
        if (bufp || altmsg || tryct < 2) {
            await pline("I've never heard of such monsters.");
        } else {
            await pline('Try again (type * for random, ESC to cancel).');
            ++altmsg;
        }
        if (tryct === CP_TRYLIM) {
            prompt = 'Create what kind of monster? [type name or symbol]';
        }
    } while (--tryct > 0);

    if (!tryct) {
        await pline(thats_enough_tries);
        return false;
    }
    return create_particular_creation(d);
}
