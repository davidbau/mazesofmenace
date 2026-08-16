// read.js — Read command / scroll effects (partial).
// C ref: read.c doread, seffects, seffect_magic_mapping, seffect_teleportation,
// seffect_light / litroom / set_lit, seffect_remove_curse,
// seffect_enchant_weapon, seffect_punishment / punish, seffect_genocide,
// do_class_genocide, do_genocide; mondata.c name_to_monclass;
// invent.c getobj; detect.c do_mapping; spell.c study_book (via spell.js);
// teleport.c scrolltele/safe_teleds; zap.c lightdamage (non-gremlin stub);
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
// (D-1098).
// Named omissions: fortune/shirt/credit-card/marker/coin/orb/candy/Braille
// Blind gates; study_book novel / dull sleep (occupation learn D-0907);
// other seffect_*; SCR_IDENTIFY SPE_IDENTIFY cast; menu_identify traditional
// ggetobj; discover_artifact / learn_egg_type in fully_identify_obj;
// SCR_DESTROY_ARMOR confused erodeproof / cursed vibrate+stun /
// blessed getobj choice / disintegrate_cursed_armor; nommap/Hallucination/
// blessed-SDOOR convert body; notice_mon_off/on; can_chant poly silent/
// headless/buzz/burble; SPE_MAGIC_MAPPING cast; SPE_REMOVE_CURSE seffects
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
// blessed getobj choice / disintegrate_cursed_armor; nommap/Hallucination/
// blessed-SDOOR convert body; notice_mon_off/on; can_chant poly silent/
// headless/buzz/burble; SPE_MAGIC_MAPPING cast; SPE_REMOVE_CURSE seffects
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
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline, urgent_pline, newsym, You_feel, verbalize } from './display.js';
import { xname, makeplural, an } from './objnam.js';
import {
    SCROLL_CLASS, SPBOOK_CLASS, COIN_CLASS, WEAPON_CLASS, GEM_CLASS,
    ARMOR_CLASS, BALL_CLASS, CHAIN_CLASS, objectNames,
} from './objects.js';
import { weight, uncurse, blessorcurse, mkobj, delobj } from './mkobj.js';
import { A_WIS, A_STR, A_CON, exercise, adjalign } from './attrib.js';
import {
    makeknown, display_pickinv_reply, identify_pack, near_capacity,
} from './invent.js';
import { more_experienced } from './exper.js';
import { do_mapping, cvt_sdoor_to_door } from './detect.js';
import { study_book, can_chant } from './spell.js';
import { scrolltele, level_tele } from './teleport.js';
import { trycall } from './do_name.js';
import { chwepon } from './wield.js';
import { destroy_arm, some_armor, setworn } from './do_wear.js';
import { dropy } from './do.js';
import { placebc } from './ball.js';
import { rn2, rnd, rn1 } from './rng.js';
import {
    COLNO, ROWNO, SDOOR, CORR, ROOMOFFSET, Is_rogue_level, Is_waterlevel,
    W_BALL, W_CHAIN, W_ART, W_ARTI, W_SADDLE, P_SLING, SPE_LIM, MM_NOEXCLAM,
    NO_MM_FLAGS, WT_IRON_BALL_INCR, thats_enough_tries, EXT_ENCUMBER,
    GENOCIDED, KILLED_BY, KILLED_BY_AN, NO_MINVENT, MM_NOMSG, Upolyd,
    nothing_happens, G_GENOD, G_EXTINCT, UNCHANGING,
} from './const.js';
import { vision_recalc, do_clear_area } from './vision.js';
import { getlin } from './getline.js';
import { name_to_mon, name_to_monclass } from './mondata.js';
import { mons, NON_PM, LOW_PM, NUMMONS, amorphous, is_whirly, unsolid,
    G_GENO, G_UNIQ, G_NOCORPSE, is_human, is_demon, pmnames, NEUTRAL,
    M2_PNAME, monsterNames, nonliving, weirdnonliving,
} from './monsters.js';
import { makemon, makemon_appear_msg, rndmonst } from './makemon.js';
import { kill_genocided_monsters, mongone } from './mon.js';
import { done } from './end.js';

const SCR_MAGIC_MAPPING = objectNames.indexOf('SCR_MAGIC_MAPPING');
const SCR_TELEPORTATION = objectNames.indexOf('SCR_TELEPORTATION');
const SCR_LIGHT = objectNames.indexOf('SCR_LIGHT');
const SCR_REMOVE_CURSE = objectNames.indexOf('SCR_REMOVE_CURSE');
const SPE_REMOVE_CURSE = objectNames.indexOf('SPE_REMOVE_CURSE');
const SCR_ENCHANT_WEAPON = objectNames.indexOf('SCR_ENCHANT_WEAPON');
const SCR_DESTROY_ARMOR = objectNames.indexOf('SCR_DESTROY_ARMOR');
const SCR_IDENTIFY = objectNames.indexOf('SCR_IDENTIFY');
const SCR_PUNISHMENT = objectNames.indexOf('SCR_PUNISHMENT');
const SCR_GENOCIDE = objectNames.indexOf('SCR_GENOCIDE');
const SCR_BLANK_PAPER = objectNames.indexOf('SCR_BLANK_PAPER');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const LEASH = objectNames.indexOf('LEASH');
const SLING = objectNames.indexOf('SLING');
const POT_WATER = objectNames.indexOf('POT_WATER');

/** C gk.known — scroll effect observed this read */
let known = false;

/** Invent-order letters for scrolls + spellbooks (C read_ok SUGGEST). */
function read_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (!o?.invlet) continue;
        if (o.oclass === SCROLL_CLASS || o.oclass === SPBOOK_CLASS) {
            lets.push(o.invlet);
        }
    }
    return lets.join('');
}

/**
 * C ref: invent.c getobj("read", read_ok, GETOBJ_PROMPT)
 * Loop on missing letter; Esc/space/return → Never mind; ?/* → pickinv.
 */
async function getobj_read() {
    for (;;) {
        await flush_topl_more();
        const lets = read_lets();
        const query = lets
            ? `What do you want to read? [${lets} or ?*]`
            : 'What do you want to read? [*]';
        const prompt = `${query} `;

        game._pending_message = prompt;
        const disp = game.nhDisplay;
        await flush_screen(1);
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);

        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // C: display_pickinv(lets or all, want_reply) → selected invlet
            const ilet = await display_pickinv_reply(ch === '*' ? '*' : lets);
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline('Never mind.');
                return null;
            }
            if (!ilet) continue; // Space/Return → re-prompt getobj
            const picked = (game.invent || []).find((o) => o.invlet === ilet);
            if (!picked) {
                await pline("You don't have that object.");
                continue;
            }
            if (picked.oclass !== SCROLL_CLASS && picked.oclass !== SPBOOK_CLASS) {
                await pline('That is a silly thing to read.');
                return null;
            }
            game._pending_message = '';
            return picked;
        }

        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        // DOWNPLAY non-scroll/book → silly_thing; seed path is scroll/book
        if (otmp.oclass !== SCROLL_CLASS && otmp.oclass !== SPBOOK_CLASS) {
            await pline('That is a silly thing to read.');
            return null;
        }
        game._pending_message = '';
        return otmp;
    }
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
 * C ref: read.c seffect_magic_mapping
 * nommap / Hallucination / blessed full SDOOR convert / confused-cursed
 * map-screw path included for call order; notice_mon deferred.
 */
async function seffect_magic_mapping(sobj) {
    const is_scroll = sobj.oclass === SCROLL_CLASS;
    const sblessed = !!sobj.blessed;
    const scursed = !!sobj.cursed;
    const confused = !!(game.u?.Confusion);
    const lf = game.level?.flags;

    if (is_scroll) {
        if (lf?.nommap) {
            await pline('Your mind is filled with crazy lines!');
            if (game.u?.Hallucination) await pline('Wow!  Modern art.');
            else await pline('Your head spins in bewilderment.');
            // make_confused deferred
            return;
        }
        if (sblessed) {
            for (let x = 1; x < COLNO; x++) {
                for (let y = 0; y < ROWNO; y++) {
                    const lev = game.level?.at(x, y);
                    if (!lev || lev.typ !== SDOOR) continue;
                    cvt_sdoor_to_door(lev);
                    if (Is_rogue_level(game.u?.uz)) vision_recalc(1);
                    newsym(x, y);
                }
            }
        }
        known = true;
    }

    if (lf?.nommap) {
        await pline('Your head spins as something blocks the spell!');
        // make_confused deferred
        return;
    }
    await pline('A map coalesces in your mind!');
    const cval = scursed && !confused;
    const u = game.u || (game.u = {});
    if (cval) u.Confusion = 1; // screw up map
    // notice_mon_off deferred
    do_mapping();
    // notice_mon_on deferred
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
 * C ref: zap.c lightdamage — non-gremlin returns amt (no RNG).
 * Gremlin rnd/losehp path deferred.
 */
function lightdamage(_obj, _ordinary, amt) {
    return amt;
}

/**
 * C ref: read.c litroom — light/darken nearby terrain + message.
 * Envelope: ordinary scroll light/dark; Rogue whole-room; swallow/water
 * no_op message; vision_recalc(2) + delayed full recalc.
 * Deferred: snuff_lit / artifact_light / Punished move_bc / gremlin hits /
 * Sunsword spot / Underwater beyond no_op gate.
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
    } else {
        // Sunsword radius-0 path deferred (scrolls use clear_area)
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
 * Unconfused: litroom(!cursed) + lightdamage when !cursed.
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
            if (lightdamage(sobj, true, 5)) known = true;
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
        && otyp !== SCR_PUNISHMENT && otyp !== SCR_GENOCIDE) {
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
                    mongone(mtmp);
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
