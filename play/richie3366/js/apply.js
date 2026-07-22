// apply.js — Apply / use tool command.
// C ref: apply.c doapply / apply_ok (LOCK_PICK / key / STETHOSCOPE body).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, canseemon, canspotmon, newsym,
} from './display.js';
import { vision_recalc, cansee } from './vision.js';
import {
    TOOL_CLASS, WAND_CLASS, SPBOOK_CLASS, WEAPON_CLASS, POTION_CLASS,
    COIN_CLASS, GEM_CLASS, FOOD_CLASS, objectNames, objectNameStrs,
    objectDescrs,
} from './objects.js';
import {
    P_AXE, P_PICK_AXE, P_POLEARMS, P_LANCE,
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, ECMD_FAIL, nothing_happens, nothing_seems_to_happen,
    FACE, TIMEOUT, BLINDED, OBJ_FREE, OBJ_INVENT, isok, SDOOR, SCORR,
    COLNO, DOOR, D_CLOSED, D_LOCKED, D_ISOPEN, ZAP_POS, MAXULEV, WEAK,
    M_AP_TYPE, M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER,
    ACCESSIBLE, IS_STWALL, IS_DOOR, TELEDS_NO_FLAGS, INTRINSIC,
    EXT_ENCUMBER, COST_DSTROY, HEAD, HAND,
    EXPL_MAGICAL, EXPL_FIERY, EXPL_FROSTY, PARANOID_BREAKWAND,
} from './const.js';
import { pick_lock } from './lock.js';
import { ustatusline, mstatusline } from './insight.js';
import { m_at, dist2, seemimic, see_monster_closeup } from './mon.js';
import { compactify_invlets, makeknown, near_capacity } from './invent.js';
import { rn2, rn1, rnd, d } from './rng.js';
import {
    nohands, haseyes, humanoid, is_demon, is_vampire, is_vampshifter,
    likes_gems, M1_SEE_INVIS, monsterNames, mons, throws_rocks,
} from './monsters.js';
import { wield_tool } from './wield.js';
import { splitobj, delobj, objects_at } from './mkobj.js';
import { xname, the, makeplural } from './objnam.js';
import { acurr, A_CHA, A_STR } from './attrib.js';
import { Monnam, mon_nam } from './do_name.js';
import { monflee } from './monmove.js';
import { nomul } from './hack.js';
import { getpos, getpos_sethilite } from './getpos.js';
import { walk_path } from './dothrow.js';
import { teleds } from './teleport.js';
import { morehungry, use_tin_opener } from './eat.js';
import { yn_function, paranoid_query } from './getline.js';
import { costly_alteration } from './shk.js';
import { zappable, release_hold } from './zap.js';
import { explode } from './explode.js';
import { flash_hits_mon } from './uhitm.js';

const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const STETHOSCOPE = objectNames.indexOf('STETHOSCOPE');
const MIRROR = objectNames.indexOf('MIRROR');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const BULLWHIP = objectNames.indexOf('BULLWHIP');
const POT_OIL = objectNames.indexOf('POT_OIL');
const CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const EUCALYPTUS_LEAF = objectNames.indexOf('EUCALYPTUS_LEAF');
const LUMP_OF_ROYAL_JELLY = objectNames.indexOf('LUMP_OF_ROYAL_JELLY');
const BANANA = objectNames.indexOf('BANANA');
const TOUCHSTONE = objectNames.indexOf('TOUCHSTONE');
const LUCKSTONE = objectNames.indexOf('LUCKSTONE');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const FLINT = objectNames.indexOf('FLINT');
const SACK = objectNames.indexOf('SACK');
const OILSKIN_SACK = objectNames.indexOf('OILSKIN_SACK');
const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const CHEST = objectNames.indexOf('CHEST');
const ICE_BOX = objectNames.indexOf('ICE_BOX');
const WOODEN_FLUTE = objectNames.indexOf('WOODEN_FLUTE');
const MAGIC_FLUTE = objectNames.indexOf('MAGIC_FLUTE');
const TOOLED_HORN = objectNames.indexOf('TOOLED_HORN');
const FROST_HORN = objectNames.indexOf('FROST_HORN');
const FIRE_HORN = objectNames.indexOf('FIRE_HORN');
const WOODEN_HARP = objectNames.indexOf('WOODEN_HARP');
const MAGIC_HARP = objectNames.indexOf('MAGIC_HARP');
const BUGLE = objectNames.indexOf('BUGLE');
const LEATHER_DRUM = objectNames.indexOf('LEATHER_DRUM');
const DRUM_OF_EARTHQUAKE = objectNames.indexOf('DRUM_OF_EARTHQUAKE');
const OIL_LAMP = objectNames.indexOf('OIL_LAMP');
const MAGIC_LAMP = objectNames.indexOf('MAGIC_LAMP');
const BRASS_LANTERN = objectNames.indexOf('BRASS_LANTERN');
const CANDELABRUM_OF_INVOCATION =
    objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const LENSES = objectNames.indexOf('LENSES');
const TIN_OPENER = objectNames.indexOf('TIN_OPENER');
const MAGIC_MARKER = objectNames.indexOf('MAGIC_MARKER');
const WAN_OPENING = objectNames.indexOf('WAN_OPENING');
const WAN_WISHING = objectNames.indexOf('WAN_WISHING');
const WAN_NOTHING = objectNames.indexOf('WAN_NOTHING');
const WAN_LOCKING = objectNames.indexOf('WAN_LOCKING');
const WAN_PROBING = objectNames.indexOf('WAN_PROBING');
const WAN_ENLIGHTENMENT = objectNames.indexOf('WAN_ENLIGHTENMENT');
const WAN_SECRET_DOOR_DETECTION =
    objectNames.indexOf('WAN_SECRET_DOOR_DETECTION');
const WAN_STASIS = objectNames.indexOf('WAN_STASIS');
const WAN_DEATH = objectNames.indexOf('WAN_DEATH');
const WAN_LIGHTNING = objectNames.indexOf('WAN_LIGHTNING');
const WAN_FIRE = objectNames.indexOf('WAN_FIRE');
const WAN_COLD = objectNames.indexOf('WAN_COLD');
const WAN_MAGIC_MISSILE = objectNames.indexOf('WAN_MAGIC_MISSILE');
const WAN_DIGGING = objectNames.indexOf('WAN_DIGGING');
const WAN_CREATE_MONSTER = objectNames.indexOf('WAN_CREATE_MONSTER');
const WAN_LIGHT = objectNames.indexOf('WAN_LIGHT');
const WAN_STRIKING = objectNames.indexOf('WAN_STRIKING');
const WAN_CANCELLATION = objectNames.indexOf('WAN_CANCELLATION');
const WAN_POLYMORPH = objectNames.indexOf('WAN_POLYMORPH');
const WAN_TELEPORTATION = objectNames.indexOf('WAN_TELEPORTATION');
const WAN_UNDEAD_TURNING = objectNames.indexOf('WAN_UNDEAD_TURNING');

const NOTHING_ELSE_HAPPENS = 'But nothing else happens...';

const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_UMBER_HULK = monsterNames.indexOf('PM_UMBER_HULK');
const PM_MEDUSA = monsterNames.indexOf('PM_MEDUSA');
const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');
/** C mon.h howmonseen bits — NORMAL suffices for lit-room pets. */
const MONSEEN_NORMAL = 0x01;
const MONSEEN_SEEINVIS = 0x02;
const MONSEEN_INFRAVIS = 0x04;
const SEENMON = MONSEEN_NORMAL | MONSEEN_SEEINVIS | MONSEEN_INFRAVIS;

/** C invent getobj callback ranks (hack.h). */
const GETOBJ_EXCLUDE = -3;
const GETOBJ_EXCLUDE_SELECTABLE = 0;
const GETOBJ_DOWNPLAY = 1;
const GETOBJ_SUGGEST = 2;

const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/** C ref: obj.h is_axe — WEAPON/TOOL with P_AXE skill. */
function is_axe(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return (game.objects?.[obj.otyp]?.oc_skill ?? 0) === P_AXE;
}

/** C ref: obj.h is_pick — WEAPON/TOOL with P_PICK_AXE skill. */
function is_pick(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return (game.objects?.[obj.otyp]?.oc_skill ?? 0) === P_PICK_AXE;
}

/** C ref: obj.h is_pole — polearms/lance (Snickersnee artifact deferred). */
function is_pole(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk === P_POLEARMS || sk === P_LANCE;
}

/** C ref: obj.h is_graystone. */
function is_graystone(obj) {
    if (!obj) return false;
    const o = obj.otyp;
    return o === LUCKSTONE || o === LOADSTONE || o === FLINT || o === TOUCHSTONE;
}

/**
 * C ref: apply.c apply_ok — SUGGEST tools/wands/spellbooks + applicable
 * weapons/oil/food/graystones; DOWNPLAY coins/unknown potions/hallu banana;
 * EXCLUDE_SELECTABLE for known non-touchstone graystones and unapplicable.
 * Snickersnee pole path deferred with other artifacts.
 */
function apply_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;

    if (obj.oclass === TOOL_CLASS || obj.oclass === WAND_CLASS
        || obj.oclass === SPBOOK_CLASS) {
        return GETOBJ_SUGGEST;
    }

    if (obj.oclass === COIN_CLASS) return GETOBJ_DOWNPLAY;

    if (obj.oclass === WEAPON_CLASS
        && (is_pick(obj) || is_axe(obj) || is_pole(obj)
            || obj.otyp === BULLWHIP)) {
        return GETOBJ_SUGGEST;
    }

    if (obj.oclass === POTION_CLASS) {
        const oc = game.objects?.[obj.otyp];
        if (!obj.dknown || !oc?.oc_name_known) return GETOBJ_DOWNPLAY;
        if (obj.otyp === POT_OIL) return GETOBJ_SUGGEST;
    }

    if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF
        || obj.otyp === LUMP_OF_ROYAL_JELLY) {
        return GETOBJ_SUGGEST;
    }

    if (obj.otyp === BANANA && game.u?.Hallucination) return GETOBJ_DOWNPLAY;

    if (is_graystone(obj)) {
        if (!obj.dknown) return GETOBJ_SUGGEST;
        const touchKnown = !!game.objects?.[TOUCHSTONE]?.oc_name_known;
        const selfKnown = !!game.objects?.[obj.otyp]?.oc_name_known;
        if (obj.otyp !== TOUCHSTONE && (touchKnown || selfKnown)) {
            return GETOBJ_EXCLUDE_SELECTABLE;
        }
        return GETOBJ_SUGGEST;
    }

    return GETOBJ_EXCLUDE_SELECTABLE;
}

/** Invent-order SUGGEST letters only (C getobj; DOWNPLAY stays off prompt). */
function apply_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && apply_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    return lets.join('');
}

/** C invent.c getobj: if (suggested > 5) compactify(bp) for prompt only. */
function apply_prompt_lets(raw) {
    if (!raw || raw.length <= 5) return raw;
    return compactify_invlets(raw);
}

/** True when invent has DOWNPLAY (forces prompt even if SUGGEST empty). */
function apply_has_downplay() {
    for (const o of game.invent || []) {
        if (apply_ok(o) === GETOBJ_DOWNPLAY) return true;
    }
    return false;
}

/**
 * C ref: invent.c getobj("use or apply", apply_ok) — loop on missing letter;
 * flush_topl_more before re-prompt so "don't have" gets --More--.
 * Empty SUGGEST with no DOWNPLAY/hands → early "don't have anything"
 * (C suggested==0 && !forceprompt && !allownone); do not prompt [*].
 */
async function getobj_apply() {
    const lets0 = apply_lets();
    // C: apply_ok(NULL) is GETOBJ_EXCLUDE — no hands; DOWNPLAY sets forceprompt.
    if (!lets0 && !apply_has_downplay()) {
        await pline("You don't have anything to use or apply.");
        return null;
    }

    for (;;) {
        await flush_topl_more();
        const rawLets = apply_lets();
        if (!rawLets && !apply_has_downplay()) {
            await pline("You don't have anything to use or apply.");
            return null;
        }
        // C: Strcpy(lets, bp); if (suggested > 5) compactify(bp); prompt uses bp
        const lets = apply_prompt_lets(rawLets);
        const query = lets
            ? `What do you want to use or apply? [${lets} or ?*]`
            : 'What do you want to use or apply? [*]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // C: display_pickinv uses non-compacted lets[]
            const { display_pickinv_reply } = await import('./invent.js');
            const ilet = await display_pickinv_reply(ch === '*' ? '*' : rawLets);
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
            const rank = apply_ok(picked);
            if (rank === GETOBJ_EXCLUDE) {
                await pline('That is a silly thing to apply.');
                return null;
            }
            game._pending_message = '';
            return picked;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        const rank = apply_ok(otmp);
        if (rank === GETOBJ_EXCLUDE) {
            await pline('That is a silly thing to apply.');
            return null;
        }
        // SUGGEST / DOWNPLAY / EXCLUDE_SELECTABLE → return; doapply default
        // prints "Sorry…" for EXCLUDE_SELECTABLE otyps.
        game._pending_message = '';
        return otmp;
    }
}

/**
 * C ref: cmd.c getdir — '.' is self (dx=dy=dz=0, success), not cancel.
 * Used by use_stethoscope; lock.js getdir still treats '.' as cancel.
 */
async function getdir_self_ok(prompt) {
    const msg = prompt || 'In what direction?';
    game._pending_message = `${msg} `;
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(game._pending_message.length, 0);
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    game._pending_message = '';
    if (!game.u) game.u = {};
    if (ch === '.') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return true;
    }
    if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
        return false;
    }
    if (!(ch in DIR_DX)) return false;
    game.u.dx = DIR_DX[ch];
    game.u.dy = DIR_DY[ch];
    game.u.dz = 0;
    return true;
}

/**
 * C ref: apply.c use_stethoscope — one free use per hero_seq; '.' → ustatusline.
 * Adjacent: isok / m_at (mundetected + mappearance seemimic + mstatusline) /
 * empty → "hear nothing special", return res (D-0735 / D-0738).
 * Deferred: swallow/steed/dz/cursed heartbeat rn2(2), confdir,
 * Deaf/nohands/freehand gates, SDOOR/SCORR hollow reveal, its_dead,
 * slime-mold fruit names, full defsyms furniture explanations,
 * mstatusline ailment/wizard-tame arms.
 * @returns {number} 1 = ECMD_TIME, 0 = ECMD_OK, -1 = ECMD_CANCEL
 */
async function use_stethoscope(_obj) {
    if (!(await getdir_self_ok(null))) return -1; // ECMD_CANCEL

    // C: first use this hero_seq is free; another use costs the turn
    if (!game.context) game.context = {};
    if (game.hero_seq == null) game.hero_seq = ((game.moves || 1) | 0) << 3;
    const seq = game.hero_seq;
    // C: res = (hero_seq == stethoscope_seq) ? ECMD_TIME : ECMD_OK
    const res = seq === (game.context.stethoscope_seq ?? 0) ? ECMD_TIME : ECMD_OK;
    game.context.stethoscope_seq = seq;

    // confdir deferred (not Confused at starter)
    const dx = game.u.dx | 0;
    const dy = game.u.dy | 0;
    if (!dx && !dy) {
        await ustatusline();
        return res;
    }

    // C: rx = u.ux + u.dx; ry = u.uy + u.dy
    const rx = (game.u.ux | 0) + dx;
    const ry = (game.u.uy | 0) + dy;
    if (!isok(rx, ry)) {
        // C: You_hear("a faint typing noise."); return ECMD_OK
        await pline('You hear a faint typing noise.');
        return ECMD_OK;
    }

    // C: m_at(rx,ry) → mundetected / mappearance seemimic / mstatusline
    const mtmp = m_at(rx, ry);
    if (mtmp) {
        const mnm = a_monnam_steth(mtmp);

        if (mtmp.mundetected) {
            if (!canspotmon(mtmp)) {
                await pline(`There is ${mnm} hidden there.`);
            }
            mtmp.mundetected = 0;
            if (mtmp.mx > 0) newsym(mtmp.mx, mtmp.my);
        } else if (mtmp.mappearance || M_AP_TYPE(mtmp)) {
            let what = 'thing';
            let use_plural = false;
            const ap = M_AP_TYPE(mtmp);
            if (ap === M_AP_OBJECT) {
                const otyp = mtmp.mappearance | 0;
                what = simple_typename_steth(otyp);
                const on = objectNames[otyp] || '';
                use_plural = on.includes('BOOTS') || on.includes('GLOVES')
                    || otyp === LENSES;
            } else if (ap === M_AP_MONSTER) {
                const ptr = mons(mtmp.mappearance | 0);
                const raw = ptr?.name || 'monster';
                what = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
            } else if (ap === M_AP_FURNITURE) {
                // defsyms[].explanation deferred
                what = 'thing';
            }
            seemimic(mtmp);
            await pline(
                `${use_plural ? 'Those' : 'That'} ${what} `
                + `${use_plural ? 'are' : 'is'} really ${mnm}.`,
            );
        } else if (game.flags?.verbose !== false && !canspotmon(mtmp)) {
            await pline(`There is ${mnm} there.`);
        }

        await mstatusline(mtmp);
        if (!canspotmon(mtmp)) {
            // map_invisible deferred — still return res
        }
        return res;
    }

    // C: SDOOR/SCORR reveal + its_dead deferred → "hear nothing special"
    const lev = game.level?.at(rx, ry);
    if (lev && (lev.typ === SDOOR || lev.typ === SCORR)) {
        // Named omission: hollow_str reveal + cvt_sdoor / unblock_point
        await pline('You hear nothing special.');
        return res;
    }

    // C: if (!its_dead(...)) You("hear nothing special."); return res
    await pline('You hear nothing special.');
    return res;
}

/** C ref: do_name.c a_monnam — ARTICLE_A for stethoscope reveal (hallu deferred). */
function a_monnam_steth(mtmp) {
    if (!mtmp) return 'a monster';
    if (mtmp.mextra?.mgivenname) return mtmp.mextra.mgivenname;
    const raw = mtmp?.data?.name || 'monster';
    const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
    const art = /^[aeiou]/i.test(plain) ? 'an' : 'a';
    return `${art} ${plain}`;
}

/** C ref: objnam.c simple_typename — otyp → lowercase name. */
function simple_typename_steth(otyp) {
    const s = objectNameStrs[otyp]
        || (objectNames[otyp] || 'object').toLowerCase().replace(/_/g, ' ');
    return s;
}

/** C mondata.h perceives — M1_SEE_INVIS. */
function perceives(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SEE_INVIS);
}

/** C mondata.h is_unicorn — S_UNICORN && likes_gems. */
function is_unicorn(ptr) {
    return ptr?.mlet === 'S_UNICORN' && likes_gems(ptr);
}

/** C hack.c closed_door — DOOR with CLOSED|LOCKED mask. */
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ !== DOOR) return false;
    return !!((loc.doormask | 0) & (D_CLOSED | D_LOCKED));
}

/**
 * C polyself.c poly_gender — 0 male / 1 female / 2 none.
 * Named omission: neuter poly forms always 2.
 */
function poly_gender() {
    return game.flags?.female ? 1 : 0;
}

/**
 * C apply.c beautiful — CHA adjective for mirror self-look.
 */
function beautiful() {
    const cha = acurr(A_CHA);
    if (cha >= 25) return 'sublime';
    if (cha >= 19) return 'splendorous';
    if (cha >= 16) return poly_gender() === 1 ? 'beautiful' : 'handsome';
    if (cha >= 14) return poly_gender() === 1 ? 'winsome' : 'amiable';
    if (cha >= 11) return 'cute';
    if (cha >= 9) return 'plain';
    if (cha >= 6) return 'homely';
    if (cha >= 4) return 'ugly';
    return 'hideous';
}

/** C objnam.c simpleonames — known mirror → "mirror". */
function simpleonames_mirror(obj) {
    const oc = game.objects?.[obj?.otyp];
    return oc?.oc_name || 'mirror';
}

/**
 * C zap.c bhit INVIS_BEAM arm — walk until mon / !ZAP_POS / closed_door.
 * Continues through minvis unless perceives; returns first usable mon.
 * Named omissions: FLASHED_LIGHT tmp_at; throw/kick paths; fhito pile.
 */
function bhit_invis_beam(ddx, ddy, range) {
    const bhitpos = game.bhitpos || (game.bhitpos = { x: 0, y: 0 });
    bhitpos.x = game.u?.ux | 0;
    bhitpos.y = game.u?.uy | 0;
    game.notonhead = false;
    let r = range | 0;
    while (r-- > 0) {
        bhitpos.x += ddx;
        bhitpos.y += ddy;
        const x = bhitpos.x | 0;
        const y = bhitpos.y | 0;
        if (!isok(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
        const typ = game.level?.at(x, y)?.typ;
        const mtmp = m_at(x, y);
        if (mtmp) {
            game.notonhead = (x !== (mtmp.mx | 0) || y !== (mtmp.my | 0));
            // C: if (!mtmp->minvis || perceives(mtmp->data)) return
            if (!mtmp.minvis || perceives(mtmp.data)) return mtmp;
        }
        if (!ZAP_POS(typ) || closed_door(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
    }
    return null;
}

/**
 * C apply.c use_mirror — getdir then reflect self / beam mon reactions.
 * Named omissions: Hallucination hcolor self; full howmonseen bits;
 * mon_reflects Medusa; nymph steal+rloc; monverbself polish; Underwater /
 * swallow / dz surface|ceiling wording; See_invisible / Invis edge cases.
 * @returns {number} ECMD_*
 */
async function use_mirror(obj) {
    if (!(await getdir_self_ok(null))) return ECMD_CANCEL;

    const u = game.u || (game.u = {});
    const invis_mirror = !!(u.Invis || u.HInvis || u.EInvis);
    const See_invisible = !!(u.See_invisible || u.HSee_invisible
        || u.ESee_invisible);
    const useeit = !Blind() && (!invis_mirror || See_invisible);
    const uvisage = beautiful();
    const mirror = simpleonames_mirror(obj);

    // C: if (obj->cursed && !rn2(2))
    if (obj.cursed && !rn2(2)) {
        if (!Blind()) {
            await pline(`The ${mirror} fogs up and doesn't reflect!`);
        } else {
            await pline(nothing_seems_to_happen);
        }
        return ECMD_TIME;
    }

    const dx = u.dx | 0;
    const dy = u.dy | 0;
    const dz = u.dz | 0;

    // C: self (!dx && !dy && !dz)
    if (!dx && !dy && !dz) {
        if (!useeit) {
            await pline(`You can't see your ${uvisage} ${body_part(FACE)}.`);
        } else {
            const umonnum = u.umonnum | 0;
            const Free_action = !!(u.Free_action || u.HFree_action
                || u.EFree_action);
            if (umonnum === PM_FLOATING_EYE) {
                if (Free_action) {
                    await pline('You stiffen momentarily under your gaze.');
                } else {
                    if (u.Hallucination) {
                        await pline(`Yow!  The ${mirror} stares back!`);
                    } else {
                        await pline("Yikes!  You've frozen yourself!");
                    }
                    if (!u.Hallucination || !rn2(4)) {
                        nomul(-rnd(MAXULEV + 6 - (u.ulevel | 0)));
                        game.multi_reason = 'gazing into a mirror';
                    }
                    game.nomovemsg = null;
                }
            } else if (is_vampire(game.youmonst?.data)
                || is_vampshifter(game.youmonst)) {
                await pline("You don't have a reflection.");
            } else if (umonnum === PM_UMBER_HULK) {
                await pline("Huh?  That doesn't look like you!");
                const { make_confused } = await import('./potion.js');
                await make_confused((u.HConfusion | 0) + d(3, 4), false);
            } else if (u.Hallucination) {
                // hcolor deferred → generic
                await pline('You look scintillating.');
            } else if (u.Sick) {
                await pline('You look peaked.');
            } else if ((u.uhs | 0) >= WEAK) {
                await pline('You look undernourished.');
            } else if (u.Upolyd) {
                const nm = game.youmonst?.data?.mname || 'a monster';
                await pline(`You look like ${nm}.`);
            } else {
                await pline(`You look as ${uvisage} as ever.`);
            }
        }
        return ECMD_TIME;
    }

    if (u.uswallow) {
        if (useeit) {
            await pline(`You reflect ${mon_nam(u.ustuck)}'s stomach.`);
        }
        return ECMD_TIME;
    }
    if (u.Underwater) {
        if (useeit) {
            await pline(u.Hallucination
                ? 'You give the fish a chance to fix their makeup.'
                : 'You reflect the murky water.');
        }
        return ECMD_TIME;
    }
    if (dz) {
        if (useeit) {
            await pline(`You reflect the ${dz > 0 ? 'floor' : 'ceiling'}.`);
        }
        return ECMD_TIME;
    }

    // C: mtmp = bhit(..., INVIS_BEAM, ...)
    const mtmp = bhit_invis_beam(dx, dy, COLNO);
    if (!mtmp || !haseyes(mtmp.data) || game.notonhead) return ECMD_TIME;

    const vis = canseemon(mtmp);
    // howmonseen deferred — lit canseemon ≡ NORMAL (not INFRAVIS-only)
    const how_seen = vis ? MONSEEN_NORMAL : 0;
    const monable = !mtmp.mcan
        && (!mtmp.minvis || perceives(mtmp.data));
    const mlet = mtmp.data?.mlet;
    const mndx = mtmp.data?.mndx ?? mtmp.mnum;

    if (mtmp.msleeping) {
        if (vis) {
            await pline(`${Monnam(mtmp)} is too tired to look at your ${mirror}.`);
        }
    } else if (!mtmp.mcansee) {
        if (vis) {
            await pline(`${Monnam(mtmp)} can't see anything right now.`);
        }
    } else if (invis_mirror && !perceives(mtmp.data)) {
        if (vis) {
            await pline(`${Monnam(mtmp)} fails to notice your ${mirror}.`);
        }
    } else if ((how_seen & SEENMON) === MONSEEN_INFRAVIS) {
        if (vis) {
            await pline(`${Monnam(mtmp)} is too far away to see in the dark.`);
        }
    } else if (mlet === 'S_VAMPIRE' || mlet === 'S_GHOST'
        || is_vampshifter(mtmp)) {
        if (vis) {
            await pline(`${Monnam(mtmp)} doesn't have a reflection.`);
        }
    } else if (monable && mndx === PM_MEDUSA) {
        // mon_reflects / stoned/killed deferred — still spend TIME
        if (vis) await pline(`${Monnam(mtmp)} is turned to stone!`);
    } else if (monable && mndx === PM_FLOATING_EYE) {
        let tmp = d(mtmp.m_lev | 0, mtmp.data?.mattk?.[0]?.damd | 0 || 1);
        if (!rn2(4)) tmp = 120;
        if (vis) {
            await pline(`${Monnam(mtmp)} is frozen by its reflection.`);
        } else {
            await pline('You hear something stop moving.');
        }
        mtmp.mfrozen = (mtmp.mfrozen | 0) + tmp;
        mtmp.mcanmove = 0;
    } else if (monable && mndx === PM_UMBER_HULK) {
        if (vis) await pline(`${Monnam(mtmp)} confuses itself!`);
        mtmp.mconf = 1;
    } else if (monable && (mlet === 'S_NYMPH' || mndx === PM_AMOROUS_DEMON)) {
        // steal + rloc deferred — pline only
        if (vis) {
            await pline(`${Monnam(mtmp)} admires itself in your ${mirror}.`);
        } else {
            await pline(`It steals your ${mirror}!`);
        }
    } else if (!is_unicorn(mtmp.data) && !humanoid(mtmp.data)
        && !is_demon(mtmp.data)
        && (!mtmp.minvis || perceives(mtmp.data)) && rn2(5)) {
        let do_react = true;
        if (mtmp.mfrozen) {
            if (vis) {
                await pline(`You discern no obvious reaction from ${mon_nam(mtmp)}.`);
            } else {
                await pline(
                    'You feel a bit silly gesturing the mirror in that direction.',
                );
            }
            do_react = false;
        }
        if (do_react) {
            if (vis) {
                await pline(`${Monnam(mtmp)} is frightened by its reflection.`);
            }
            await monflee(mtmp, d(2, 4), false, false);
        }
    } else if (!Blind()) {
        if (mtmp.minvis && !See_invisible) {
            // silent
        } else if ((mtmp.minvis && !perceives(mtmp.data))
            || !haseyes(mtmp.data) || game.notonhead || !mtmp.mcansee) {
            await pline(
                `${Monnam(mtmp)} doesn't seem to notice its reflection.`,
            );
        } else {
            await pline(`${Monnam(mtmp)} ignores its reflection.`);
        }
    }
    return ECMD_TIME;
}

/**
 * C invent.c consume_obj_charge — spe--; unpaid/update_inventory deferred.
 */
function consume_obj_charge(obj, _maybe_unpaid) {
    if (!obj) return;
    obj.spe = (obj.spe | 0) - 1;
}

/**
 * C zap.c bhit FLASHED_LIGHT — first non-minvis mon stops the beam;
 * minvis calls flash_hits_mon and continues (C zap.c bhit).
 * Named omissions: tmp_at flash glyph; transient_light; iron bars;
 * M_AP_OBJECT skip.
 */
async function bhit_flashed_light(ddx, ddy, range, obj) {
    const bhitpos = game.bhitpos || (game.bhitpos = { x: 0, y: 0 });
    bhitpos.x = game.u?.ux | 0;
    bhitpos.y = game.u?.uy | 0;
    game.notonhead = false;
    let r = range | 0;
    while (r-- > 0) {
        bhitpos.x += ddx;
        bhitpos.y += ddy;
        const x = bhitpos.x | 0;
        const y = bhitpos.y | 0;
        if (!isok(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
        const typ = game.level?.at(x, y)?.typ;
        const mtmp = m_at(x, y);
        if (mtmp) {
            game.notonhead = (x !== (mtmp.mx | 0) || y !== (mtmp.my | 0));
            if (mtmp.minvis) {
                if (obj) {
                    obj.ox = game.u.ux | 0;
                    obj.oy = game.u.uy | 0;
                    await flash_hits_mon(mtmp, obj);
                }
            } else {
                return mtmp;
            }
        }
        if (!ZAP_POS(typ) || closed_door(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
    }
    return null;
}

/**
 * C apply.c do_blinding_ray — FLASHED_LIGHT bhit + flash_hits_mon.
 */
async function do_blinding_ray(obj) {
    const mtmp = await bhit_flashed_light(
        game.u.dx | 0, game.u.dy | 0, COLNO, obj,
    );
    obj.ox = game.u.ux | 0;
    obj.oy = game.u.uy | 0;
    if (mtmp) {
        await flash_hits_mon(mtmp, obj);
        // C: camera → see_monster_closeup(mtmp, TRUE) (D-0999)
        if ((obj.otyp | 0) === EXPENSIVE_CAMERA) {
            await see_monster_closeup(mtmp, true);
        }
    }
    // transient_light_cleanup deferred
}

/**
 * C apply.c use_camera — getdir; charge; cursed/self zapyourself; ray.
 * Named omissions: Underwater warranty polish; swallow/dz photos;
 * full zapyourself CAMERA; flash_hits_mon mimic/gremlin polish.
 * @returns {number} ECMD_*
 */
async function use_camera(obj) {
    if (game.u?.Underwater) {
        await pline('Using your camera underwater would void the warranty.');
        return ECMD_OK;
    }
    if (!(await getdir_self_ok(null))) return ECMD_CANCEL;

    if ((obj.spe | 0) <= 0) {
        await pline(nothing_happens);
        return ECMD_TIME;
    }
    consume_obj_charge(obj, true);

    const u = game.u || {};
    if (obj.cursed && !rn2(2)) {
        const { zapyourself } = await import('./zap.js');
        await zapyourself(obj, true);
    } else if (u.uswallow) {
        await pline(`You take a picture of ${mon_nam(u.ustuck)}'s stomach.`);
    } else if (u.dz) {
        await pline(
            `You take a picture of the ${u.dz > 0 ? 'floor' : 'ceiling'}.`,
        );
    } else if (!(u.dx | 0) && !(u.dy | 0)) {
        const { zapyourself } = await import('./zap.js');
        await zapyourself(obj, true);
    } else {
        await do_blinding_ray(obj);
    }
    return ECMD_TIME;
}

/** C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (D-0716: no sticky). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h BlindedTimeout — HBlinded & TIMEOUT. */
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}

/**
 * C ref: potion.c make_blinded + toggle_blindness subset.
 * Sets HBlinded TIMEOUT; on sight toggle → botl + vision_recalc(0).
 * Eyes override / Punished set_bc / Blind_telepat see_monsters / talk deferred.
 */
function make_blinded(xtime, _talk) {
    const u = game.u || (game.u = {});
    const old = BlindedTimeout();
    // C probes Blind via props before committing xtime
    const u_could_see = !Blind();
    u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT) | (xtime ? 1 : 0);
    const can_see_now = !Blind();
    u.HBlinded = ((u.HBlinded | 0) & ~TIMEOUT) | (old & TIMEOUT);

    const next = ((u.HBlinded | 0) & ~TIMEOUT)
        | (xtime ? (xtime & TIMEOUT) : 0);
    u.HBlinded = next;
    // C: HBlinded ≡ uprops[BLINDED].intrinsic — keep in sync (D-0928 #1171)
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[BLINDED]) {
        u.uprops[BLINDED] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    }
    u.uprops[BLINDED].intrinsic =
        ((u.uprops[BLINDED].intrinsic | 0) & ~TIMEOUT) | (next & TIMEOUT);
    u.Blind = Blind();
    if (u_could_see !== can_see_now) {
        // C: toggle_blindness — botl + vision_full_recalc + vision_recalc(0)
        if (game.flags) game.flags.botl = true;
        game.vision_full_recalc = 1;
        vision_recalc(0);
        // Blind_telepat / Infravision / Sting see_monsters deferred
    }
}

/** C ref: mondata.c body_part — FACE/HEAD/HAND; poly table deferred. */
function body_part(part) {
    if (part === FACE) return 'face';
    if (part === HEAD) return 'head';
    if (part === HAND) return 'hand';
    return 'body part';
}

/**
 * C ref: mondata.c can_blnd(NULL, &youmonst, AT_WEAP, cream_pie) subset.
 * Named omissions: visored helmet; mon_perma_blind; raven-vs-raven.
 */
function can_blnd_cream_self(obj) {
    const you = game.youmonst;
    if (!haseyes(you?.data)) return false;
    // C: Blindfolded ≡ EBlinded / ublindf blocks cream on hero
    if (game.u?.ublindf || (game.u?.EBlinded | 0)) return false;
    void obj;
    return true;
}

/** C ref: worn.c setnotworn — clear hero worn slots pointing at obj. */
function setnotworn(obj) {
    if (!obj) return;
    const u = game.u || {};
    for (const slot of [
        'uwep', 'uswapwep', 'uqwep',
        'uarm', 'uarmc', 'uarmh', 'uarms', 'uarmg', 'uarmf', 'uarmu',
        'uleft', 'uright', 'uamul', 'ublindf',
    ]) {
        if (u[slot] === obj) u[slot] = null;
    }
    obj.owornmask = 0;
}

/** Remove obj from invent array (C freeinv / obj_extract_self OBJ_INVENT). */
function freeinv_pie(obj) {
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.where = OBJ_FREE;
}

/**
 * C ref: apply.c use_cream_pie — immerse face; blindinc rnd(25); splat+delobj.
 * Named omissions: costly_alteration COST_SPLAT shop bill; invent-array
 * wiring when splitobj child is not pushed (quan>1 rare for wish).
 * @returns {number} ECMD_OK (C never spends a turn)
 */
async function use_cream_pie(obj) {
    const u = game.u || (game.u = {});
    const wasblind = Blind();
    const wascreamed = !!(u.ucreamed | 0);
    let several = false;
    let pie = obj;

    if ((pie.quan || 1) > 1) {
        several = true;
        const child = splitobj(pie, 1);
        if (child) {
            // C invent split leaves child free of parent stack; splice child in
            const inv = game.invent || [];
            const pidx = inv.indexOf(pie);
            if (pidx >= 0) inv.splice(pidx + 1, 0, child);
            else inv.push(child);
            child.where = pie.where;
            pie = child;
        }
    }

    if (u.Hallucination) {
        await pline('You give yourself a facial.');
    } else {
        const xn = xname(pie);
        await pline(
            `You immerse your ${body_part(FACE)} in ${
                several ? 'one of ' : ''
            }${several ? makeplural(the(xn)) : the(xn)}.`,
        );
    }

    if (can_blnd_cream_self(pie)) {
        const blindinc = rnd(25);
        u.ucreamed = (u.ucreamed | 0) + blindinc;
        make_blinded(BlindedTimeout() + blindinc, false);
        if (!Blind() || (Blind() && wasblind)) {
            await pline(
                `There's ${wascreamed ? 'more ' : ''}sticky goop all over your ${
                    body_part(FACE)}.`,
            );
        } else {
            await pline(
                `You can't see through all the sticky goop on your ${
                    body_part(FACE)}.`,
            );
        }
    }

    setnotworn(pie);
    // costly_alteration(COST_SPLAT) deferred — shop unpaid message only
    freeinv_pie(pie);
    delobj(pie); // obj_resists rn2(100) then extract+free
    return ECMD_OK;
}

/** C ref: objnam.c yname — invent → "your …". */
function yname(obj) {
    return `your ${xname(obj)}`;
}

/** C ref: o_init.c objdescr_is — appearance string match. */
function objdescr_is(obj, descr) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp];
    if (!oc) return false;
    const dn = objectDescrs[oc.oc_descr_idx ?? obj.otyp];
    return dn != null && dn === descr;
}

/** C ref: invent.c freehand — either hand free. */
function freehand_break() {
    const u = game.u || {};
    const uwep = u.uwep;
    if (!uwep) return true;
    const bimanual = !!(game.objects?.[uwep.otyp]?.oc_bimanual
        || game.objects?.[uwep.otyp]?.oc_big);
    if (!bimanual && (!u.uarms || !u.uarms.cursed)) return true;
    if (!uwep.cursed) return true;
    return false;
}

/**
 * C ref: apply.c discard_broken_wand — delobj current_wand + nomul(0).
 */
async function discard_broken_wand() {
    const obj = game.current_wand;
    game.current_wand = null;
    if (obj) delobj(obj);
    nomul(0);
}

/**
 * C ref: apply.c broken_wand_explode — explode + makeknown + discard.
 * explode() bills shopdamage via zap_over_floor (D-0949).
 */
async function broken_wand_explode(obj, dmg, expltype) {
    const u = game.u || {};
    await explode(u.ux | 0, u.uy | 0, -(obj.otyp | 0), dmg, WAND_CLASS, expltype);
    makeknown(obj.otyp);
    await discard_broken_wand();
}

/**
 * C ref: apply.c do_break_wand — apply a wand by breaking it.
 * Envelope: nohands/freehand/STR gates; paranoid_query confirm; unpaid
 * costly_alteration; freeinv; zappable restore charge; explode-type
 * wands (death/lightning/fire/cold/missile); nothing-else inert wands;
 * magical explode + WAN_DIGGING adjacent dig_check/digactualhole +
 * WAN_CREATE_MONSTER makemon + dig shop pay_for_damage (D-0950);
 * strike/cancel/poly/tele/undead adjacent bhitm/bhitpile/zapyourself
 * + WAN_LIGHT litroom (D-0952).
 * Named omit: check_unpaid bill polish; ICE spot_stop_timers;
 * HOLE goto_level; revive container/buried polish.
 * @returns {number} ECMD_*
 */
async function do_break_wand(obj) {
    if (!obj) return ECMD_OK;
    const is_fragile = objdescr_is(obj, 'balsa') || objdescr_is(obj, 'glass');

    if (nohands(game.youmonst?.data)) {
        await pline(`You can't break ${yname(obj)} without hands!`);
        return ECMD_OK;
    }
    if (!freehand_break()) {
        await pline(`Your ${makeplural(body_part(HAND))} are occupied!`);
        return ECMD_OK;
    }
    if (acurr(A_STR) < (is_fragile ? 5 : 10)) {
        await pline(`You don't have the strength to break ${yname(obj)}!`);
        return ECMD_OK;
    }

    // C: paranoid_query(ParanoidBreakwand, …) — getlin "yes" when bit set
    const bits = game.flags?.paranoia_bits | 0;
    const be_paranoid = (bits & PARANOID_BREAKWAND) !== 0;
    if (!(await paranoid_query(
        be_paranoid,
        `Are you really sure you want to break ${yname(obj)}?`,
    ))) {
        return ECMD_OK;
    }

    await pline(
        `Raising ${yname(obj)} high above your ${body_part(HEAD)}, you ${
            is_fragile ? 'snap' : 'break'
        } it in two!`,
    );

    if (obj.unpaid) {
        // check_unpaid deferred — costly_alteration bills destroy
        await costly_alteration(obj, COST_DSTROY);
    }

    game.current_wand = obj;
    freeinv_pie(obj);
    setnotworn(obj);

    if (!zappable(obj)) {
        await pline(NOTHING_ELSE_HAPPENS);
        await discard_broken_wand();
        return ECMD_TIME;
    }
    // zappable consumed a charge; put it back
    obj.spe = (obj.spe | 0) + 1;
    if (!(obj.spe | 0)) obj.spe = rnd(3);

    const u = game.u || {};
    obj.ox = u.ux | 0;
    obj.oy = u.uy | 0;
    let dmg = (obj.spe | 0) * 4;
    let affects_objects = false;

    switch (obj.otyp) {
    case WAN_OPENING:
        if (u.ustuck) {
            await release_hold();
            if (obj.dknown) makeknown(WAN_OPENING);
            await discard_broken_wand();
            return ECMD_TIME;
        }
        // FALLTHROUGH
    case WAN_WISHING:
    case WAN_NOTHING:
    case WAN_LOCKING:
    case WAN_PROBING:
    case WAN_ENLIGHTENMENT:
    case WAN_SECRET_DOOR_DETECTION:
    case WAN_STASIS:
        await pline(NOTHING_ELSE_HAPPENS);
        await discard_broken_wand();
        return ECMD_TIME;
    case WAN_DEATH:
    case WAN_LIGHTNING:
        await broken_wand_explode(obj, dmg * 4, EXPL_MAGICAL);
        return ECMD_TIME;
    case WAN_FIRE:
        await broken_wand_explode(obj, dmg * 2, EXPL_FIERY);
        return ECMD_TIME;
    case WAN_COLD:
        await broken_wand_explode(obj, dmg * 2, EXPL_FROSTY);
        return ECMD_TIME;
    case WAN_MAGIC_MISSILE:
        await broken_wand_explode(obj, dmg, EXPL_MAGICAL);
        return ECMD_TIME;
    case WAN_STRIKING:
        await pline('A wall of force smashes down around you!');
        dmg = d(1 + (obj.spe | 0), 6);
        // FALLTHROUGH
    case WAN_CANCELLATION:
    case WAN_POLYMORPH:
    case WAN_TELEPORTATION:
    case WAN_UNDEAD_TURNING:
        affects_objects = true;
        break;
    default:
        break;
    }

    // magical explosion before specific effects
    await explode(
        obj.ox | 0, obj.oy | 0, -(obj.otyp | 0), rnd(dmg),
        WAND_CLASS, EXPL_MAGICAL,
    );

    const {
        dig_check, fillholetyp, digactualhole, liquid_flow,
        fill_pit, maybe_dunk_boulders, watch_dig,
    } = await import('./dig.js');
    const {
        DIGCHECK_FAILED, DIGCHECK_FAIL_BOULDER, IS_WALL, IS_DOOR,
        Can_dig_down, PIT, HOLE, ROOM, ICE, N_DIRS, xdir, ydir, isok,
        SHOPBASE, NO_MM_FLAGS, NO_KILLER_PREFIX,
    } = await import('./const.js');
    const { in_rooms, losehp, maybe_half_phys } = await import('./hack.js');
    const { makemon } = await import('./makemon.js');
    const { pay_for_damage } = await import('./shk.js');
    const { recalc_block_point } = await import('./vision.js');
    const { t_at } = await import('./trap.js');
    const {
        bhitm, bhitpile, bhito, zapsetup, zapwrapup, zapyourself,
    } = await import('./zap.js');
    const { m_at } = await import('./mon.js');
    const { litroom } = await import('./read.js');
    const { finish_losehp_done } = await import('./end.js');

    zapsetup();

    let shop_damage = false;
    let fillmsg = false;
    const BY_OBJECT = null;

    for (let i = 0; i <= N_DIRS; i++) {
        const x = (obj.ox | 0) + (xdir[i] | 0);
        const y = (obj.oy | 0) + (ydir[i] | 0);
        if (!isok(x, y)) continue;

        if (!game._bhitpos) game._bhitpos = { x: 0, y: 0 };
        game._bhitpos.x = x;
        game._bhitpos.y = y;

        if (obj.otyp === WAN_DIGGING) {
            const dcres = dig_check(BY_OBJECT, x, y);
            if (dcres < DIGCHECK_FAILED || dcres === DIGCHECK_FAIL_BOULDER) {
                const lev = game.level?.at(x, y);
                if (lev && (IS_WALL(lev.typ) || IS_DOOR(lev.typ))) {
                    await watch_dig(null, x, y, true);
                    if (in_rooms(x, y, SHOPBASE)) shop_damage = true;
                }
                // ICE spot_stop_timers deferred
                void ICE;
                const typ = fillholetyp(x, y, false);
                if (typ !== ROOM) {
                    if (lev) {
                        lev.typ = typ;
                        lev.flags = 0;
                    }
                    await liquid_flow(
                        x, y, typ, t_at(x, y),
                        fillmsg
                            ? null
                            : 'Some holes are quickly filled with %s!',
                    );
                    fillmsg = true;
                } else {
                    const pitOnly = rn2(obj.spe | 0) < 3
                        || (!Can_dig_down(u.uz) && !lev?.candig);
                    await digactualhole(
                        x, y, BY_OBJECT, pitOnly ? PIT : HOLE,
                    );
                }
            }
            fill_pit(x, y);
            maybe_dunk_boulders(x, y);
            recalc_block_point(x, y);
            continue;
        }
        if (obj.otyp === WAN_CREATE_MONSTER) {
            // near hero — x,y might be rock
            makemon(null, u.ux | 0, u.uy | 0, NO_MM_FLAGS);
            continue;
        }
        if (x !== (u.ux | 0) || y !== (u.uy | 0)) {
            const mon = m_at(x, y);
            if (mon) await bhitm(mon, obj);
            if (affects_objects && objects_at(x, y)) {
                await bhitpile(obj, bhito, x, y, 0);
            }
        } else {
            if (affects_objects && objects_at(x, y)) {
                await bhitpile(obj, bhito, x, y, 0);
            }
            const damage = await zapyourself(obj, false);
            if (damage) {
                const him = game.flags?.female ? 'her' : 'him';
                const buf = `killed ${him}self by breaking a wand`;
                losehp(maybe_half_phys(damage), buf, NO_KILLER_PREFIX);
                if (game._losehp_needs_done || game.program_state?.gameover) {
                    await finish_losehp_done();
                }
            }
        }
    }

    await zapwrapup();

    if (shop_damage) {
        await pay_for_damage('dig into', false);
    }

    if (obj.otyp === WAN_LIGHT) {
        await litroom(true, obj);
    }

    await discard_broken_wand();
    return ECMD_TIME;
}

/**
 * C ref: apply.c doapply() — nohands + check_capacity before getobj;
 * LOCK_PICK/key/STETHOSCOPE + MIRROR/CAMERA + sack/bag use_container +
 * musical instruments + cream pie + MAGIC_MARKER→dowrite + TIN_OPENER +
 * WAND_CLASS → do_break_wand (D-0949 explode-type / D-0950 dig+create /
 * D-0952 strike/cancel/poly/tele/undead bhit + WAN_LIGHT) +
 * is_pick/is_axe → use_pick_axe (D-0951).
 * Named omissions: retouch_object; flip_through_book; flip_coin; jelly;
 * whip/grapple/blindfold/lenses; use_stone; use_pole; traps;
 * oil; BoT; Medusa/nymph mirror arms; most non-instrument
 * tools; break-wand release_hold / flash_hits (D-0979).
 * @returns {boolean} true if the command took time (ECMD_TIME)
 */
export async function doapply() {
    // C ref: apply.c doapply — nohands + check_capacity((char *)0) before getobj
    if (nohands(game.youmonst?.data)) {
        await pline("You aren't able to use or apply tools in your current form.");
        return false; // ECMD_OK
    }
    // C ref: hack.c check_capacity — near_capacity >= EXT_ENCUMBER
    if (near_capacity() >= EXT_ENCUMBER) {
        await pline("You can't do that while carrying so much stuff.");
        return false; // ECMD_OK
    }

    const obj = await getobj_apply();
    if (!obj) return false;

    // C: WAND_CLASS → do_break_wand (before tool cases in C after getobj)
    if (obj.oclass === WAND_CLASS) {
        const res = await do_break_wand(obj);
        return (res & ECMD_TIME) !== 0;
    }

    if (obj.otyp === LOCK_PICK || obj.otyp === SKELETON_KEY
        || obj.otyp === CREDIT_CARD) {
        // C: res = (pick_lock(...) != 0) ? ECMD_TIME : ECMD_OK
        const pl = await pick_lock(obj);
        return pl !== 0;
    }

    if (obj.otyp === STETHOSCOPE) {
        const res = await use_stethoscope(obj);
        return res > 0; // ECMD_TIME only
    }

    // C apply.c case MIRROR → use_mirror (D-0736)
    if (obj.otyp === MIRROR) {
        const res = await use_mirror(obj);
        return res === ECMD_TIME;
    }

    // C apply.c case EXPENSIVE_CAMERA → use_camera (D-0736 partial)
    if (obj.otyp === EXPENSIVE_CAMERA) {
        const res = await use_camera(obj);
        return res === ECMD_TIME;
    }

    // C: SACK / BAG_OF_HOLDING / OILSKIN_SACK → use_container(&obj, TRUE, FALSE)
    if (obj.otyp === SACK || obj.otyp === OILSKIN_SACK
        || obj.otyp === BAG_OF_HOLDING
        || obj.otyp === LARGE_BOX || obj.otyp === CHEST
        || obj.otyp === ICE_BOX) {
        const { use_container } = await import('./pickup.js');
        const { ECMD_TIME } = await import('./const.js');
        const res = await use_container(obj, true, false);
        return res === ECMD_TIME;
    }
    if (obj.otyp === BAG_OF_TRICKS) {
        await pline("Sorry, I don't know how to use that.");
        return false;
    }

    // C apply.c: WOODEN_FLUTE..DRUM_OF_EARTHQUAKE → do_play_instrument
    if (obj.otyp === WOODEN_FLUTE || obj.otyp === MAGIC_FLUTE
        || obj.otyp === TOOLED_HORN || obj.otyp === FROST_HORN
        || obj.otyp === FIRE_HORN || obj.otyp === WOODEN_HARP
        || obj.otyp === MAGIC_HARP || obj.otyp === BUGLE
        || obj.otyp === LEATHER_DRUM || obj.otyp === DRUM_OF_EARTHQUAKE) {
        const { do_play_instrument } = await import('./music.js');
        const { ECMD_TIME } = await import('./const.js');
        const res = await do_play_instrument(obj);
        return res === ECMD_TIME;
    }

    // C apply.c case CREAM_PIE → use_cream_pie (D-0711)
    if (obj.otyp === CREAM_PIE) {
        const res = await use_cream_pie(obj);
        return res === ECMD_TIME;
    }

    // C apply.c case MAGIC_MARKER → dowrite (D-0742)
    if (obj.otyp === MAGIC_MARKER) {
        const { dowrite } = await import('./write.js');
        const res = await dowrite(obj);
        return res === ECMD_TIME;
    }

    // C apply.c case TIN_OPENER → use_tin_opener (D-0940)
    if (obj.otyp === TIN_OPENER) {
        const res = await use_tin_opener(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c PICK_AXE/DWARVISH_MATTOCK + default is_pick|is_axe (D-0951)
    if (is_pick(obj) || is_axe(obj)) {
        const { use_pick_axe } = await import('./dig.js');
        const res = await use_pick_axe(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // Other apply otyps deferred
    await pline("Sorry, I don't know how to use that.");
    return false;
}

/** C ref: apply.c rub_ok */
function rub_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
        || obj.otyp === BRASS_LANTERN || is_graystone(obj)
        || obj.otyp === LUMP_OF_ROYAL_JELLY) {
        return GETOBJ_SUGGEST;
    }
    return GETOBJ_EXCLUDE;
}

function rub_suggest_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && rub_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

/**
 * C ref: invent.c getobj("rub", rub_ok) — also consumes CMDQ_KEY from
 * game._cmdq_canned when dorub re-queues after wield_tool.
 */
async function getobj_rub() {
    // C getobj: cmdq_pop CMDQ_KEY before interactive prompt
    const q = game._cmdq_canned;
    if (q?.length) {
        const head = q[0];
        if (head && typeof head === 'object' && head.typ === 'key') {
            q.shift();
            const ch = String.fromCharCode(head.key);
            for (const o of game.invent || []) {
                if (o.invlet === ch && rub_ok(o) === GETOBJ_SUGGEST) return o;
            }
            game._cmdq_canned = [];
            return null;
        }
    }

    const raw = rub_suggest_lets();
    if (!raw) {
        await pline("You don't have anything to rub.");
        return null;
    }
    for (;;) {
        await flush_topl_more();
        const lets = raw.length > 5 ? compactify_invlets(raw) : raw;
        const query = `What do you want to rub? [${lets} or ?*]`;
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        if (key === 27) return null;
        const ch = String.fromCharCode(key);
        if (ch === '?' || ch === '*') {
            // menu listing deferred — re-prompt
            continue;
        }
        for (const o of game.invent || []) {
            if (o.invlet === ch && rub_ok(o) === GETOBJ_SUGGEST) return o;
        }
        await pline(`You don't have that object.`);
    }
}

/** C ref: cmd.c cmdq_add_ec / cmdq_add_key for dorub re-queue after wield. */
function cmdq_add_ec(fn) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    game._cmdq_canned.push(fn);
}
function cmdq_add_key(ch) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    const key = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
    game._cmdq_canned.push({ typ: 'key', key });
}

/**
 * C ref: apply.c dorub — #rub lamp/stone/jelly.
 * Named omissions: use_stone / use_royal_jelly; djinni_from_bottle / begin_burn
 * full lamp transform; check_unpaid_usage; Blind smoke wording uses see/smell.
 * @returns {number} ECMD_*
 */
export async function dorub() {
    const youdata = game.youmonst?.data;
    if (youdata && nohands(youdata)) {
        await pline("You aren't able to rub anything without hands.");
        return ECMD_OK;
    }
    const obj = await getobj_rub();
    if (!obj) return ECMD_CANCEL;

    if (obj.oclass === GEM_CLASS || obj.oclass === FOOD_CLASS) {
        // use_stone / use_royal_jelly deferred
        await pline("Sorry, I don't know how to use that.");
        return ECMD_OK;
    }

    const u = game.u || {};
    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'rub')) {
            cmdq_add_ec(dorub);
            cmdq_add_key(obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    // now uwep is obj
    if (obj.otyp === MAGIC_LAMP) {
        if ((obj.spe | 0) > 0 && !rn2(3)) {
            // djinni_from_bottle / begin_burn / check_unpaid deferred
            obj.otyp = OIL_LAMP;
            obj.spe = 0;
            obj.age = rn1(500, 1000);
            makeknown(MAGIC_LAMP);
        } else if (rn2(2)) {
            const Blind = !!(u.Blind);
            await pline(`You ${Blind ? 'smell' : 'see a puff of'} smoke.`);
        } else {
            await pline(nothing_happens);
        }
    } else if (obj.otyp === BRASS_LANTERN) {
        await pline('Rubbing the electric lamp is not particularly rewarding.');
        await pline('Anyway, nothing exciting happens.');
    } else {
        await pline(nothing_happens);
    }
    return ECMD_TIME;
}

// --- #jump (apply.c dojump / jump) -----------------------------------------

const BOULDER = objectNames.indexOf('BOULDER');

/** C ref: apply.c enum jump_trajectory */
const J_ANY = 0;
const J_HORZ = 1;
const J_VERT = 2;
const J_DIAG = 3;

/** C: Jumping (HJumping || EJumping). */
function Jumping() {
    const u = game.u || {};
    return !!(u.HJumping || u.EJumping);
}

/** C: Passes_walls — not needed for knight physical jump; stub false. */
function Passes_walls() {
    const u = game.u || {};
    return !!(u.HPasses_walls || u.EPasses_walls);
}

function closed_door_xy(x, y) {
    const loc = game.level?.locations?.[x]?.[y];
    if (!loc || !IS_DOOR(loc.typ)) return false;
    const m = loc.doormask | 0;
    return (m & (D_CLOSED | D_LOCKED)) !== 0;
}

function sobj_at_otyp(otyp, x, y) {
    if (otyp < 0) return null;
    for (const obj of objects_at(x, y) || []) {
        if ((obj.otyp | 0) === otyp) return obj;
    }
    return null;
}

function distu_xy(x, y) {
    const u = game.u || {};
    return dist2(u.ux | 0, u.uy | 0, x, y);
}

/**
 * C ref: apply.c check_jump — walk_path callback for jump clearance.
 * @param {number} traj
 */
function check_jump(traj, x, y) {
    if (Passes_walls()) return true;
    const loc = game.level?.locations?.[x]?.[y];
    if (!loc) return false;
    if (IS_STWALL(loc.typ)) return false;
    if (IS_DOOR(loc.typ)) {
        if (closed_door_xy(x, y)) return false;
        if ((loc.doormask & D_ISOPEN) !== 0 && traj !== J_ANY) {
            if (traj === J_DIAG
                || (((traj & J_HORZ) !== 0) === !!(loc.horizontal))) {
                return false;
            }
        }
    }
    if (sobj_at_otyp(BOULDER, x, y)
        && !throws_rocks(game.youmonst?.data)) {
        return false;
    }
    return true;
}

/**
 * C ref: apply.c is_valid_jump_pos
 * Named omissions: full doorway horizontal bit edge cases already mirrored.
 */
async function is_valid_jump_pos(x, y, magic, showmsg) {
    const u = game.u || {};
    const HJumping = u.HJumping | 0;
    const EJumping = u.EJumping | 0;
    // C: !magic && !(HJumping & ~INTRINSIC) && !EJumping && distu != 5
    // Knight FROMOUTSIDE is inside INTRINSIC → chess-only unless extrinsic.
    if (!magic && !(HJumping & ~INTRINSIC) && !EJumping && distu_xy(x, y) !== 5) {
        if (showmsg) await pline('Illegal move!');
        return false;
    } else if (distu_xy(x, y) > (magic ? 6 + magic * 3 : 9)) {
        if (showmsg) await pline('Too far!');
        return false;
    } else if (!isok(x, y)) {
        if (showmsg) await pline('You cannot jump there!');
        return false;
    } else if (!cansee(x, y)) {
        if (showmsg) await pline('You cannot see where to land!');
        return false;
    } else {
        const lev = game.level?.locations?.[u.ux]?.[u.uy];
        const dx = (x | 0) - (u.ux | 0);
        const dy = (y | 0) - (u.uy | 0);
        let ax = Math.abs(dx);
        let ay = Math.abs(dy);
        const diag = (magic || Passes_walls() || (!dx && !dy))
            ? J_ANY
            : !dy ? J_HORZ : !dx ? J_VERT : J_DIAG;
        if (ax >= 2 * ay) ay = 0;
        else if (ay >= 2 * ax) ax = 0;
        const traj = (magic || Passes_walls() || (!ax && !ay))
            ? J_ANY
            : !ay ? J_HORZ : !ax ? J_VERT : J_DIAG;
        if (diag === J_DIAG && lev && IS_DOOR(lev.typ)
            && (lev.doormask & D_ISOPEN) !== 0
            && (traj === J_DIAG
                || (((traj & J_HORZ) !== 0) === !!(lev.horizontal)))) {
            if (showmsg) await pline("You can't jump diagonally out of a doorway.");
            return false;
        }
        const uc = { x: u.ux | 0, y: u.uy | 0 };
        const tc = { x: x | 0, y: y | 0 };
        if (!walk_path(uc, tc, (arg, nx, ny) => check_jump(arg, nx, ny), traj)) {
            if (showmsg) {
                await pline('There is an obstacle preventing that jump.');
            }
            return false;
        }
    }
    return true;
}

/** C ref: apply.c get_valid_jump_position */
function get_valid_jump_position(x, y) {
    const loc = game.level?.locations?.[x]?.[y];
    if (!isok(x, y)) return false;
    if (!(ACCESSIBLE(loc?.typ) || Passes_walls())) return false;
    // sync validation without messages — use a sync subset
    return is_valid_jump_pos_sync(x, y, game.jumping_is_magic | 0);
}

/**
 * Sync mirror of is_valid_jump_pos for getpos_getvalid (no pline).
 */
function is_valid_jump_pos_sync(x, y, magic) {
    const u = game.u || {};
    const HJumping = u.HJumping | 0;
    const EJumping = u.EJumping | 0;
    if (!magic && !(HJumping & ~INTRINSIC) && !EJumping && distu_xy(x, y) !== 5) {
        return false;
    }
    if (distu_xy(x, y) > (magic ? 6 + magic * 3 : 9)) return false;
    if (!isok(x, y)) return false;
    if (!cansee(x, y)) return false;
    const lev = game.level?.locations?.[u.ux]?.[u.uy];
    const dx = (x | 0) - (u.ux | 0);
    const dy = (y | 0) - (u.uy | 0);
    let ax = Math.abs(dx);
    let ay = Math.abs(dy);
    const diag = (magic || Passes_walls() || (!dx && !dy))
        ? J_ANY
        : !dy ? J_HORZ : !dx ? J_VERT : J_DIAG;
    if (ax >= 2 * ay) ay = 0;
    else if (ay >= 2 * ax) ax = 0;
    const traj = (magic || Passes_walls() || (!ax && !ay))
        ? J_ANY
        : !ay ? J_HORZ : !ax ? J_VERT : J_DIAG;
    if (diag === J_DIAG && lev && IS_DOOR(lev.typ)
        && (lev.doormask & D_ISOPEN) !== 0
        && (traj === J_DIAG
            || (((traj & J_HORZ) !== 0) === !!(lev.horizontal)))) {
        return false;
    }
    const uc = { x: u.ux | 0, y: u.uy | 0 };
    const tc = { x: x | 0, y: y | 0 };
    return walk_path(uc, tc, (arg, nx, ny) => check_jump(arg, nx, ny), traj);
}

/**
 * C ref: apply.c display_jump_positions — tmp_at goodpos hilite.
 * Named omission: S_goodpos glyph paint (tmp_at DISP_BEAM); getpos_sethilite
 * still force-newsyms valid cells so flush_screen(0) cursor matches C.
 */
function display_jump_positions(_on_off) {
    // deferred: tmp_at(DISP_BEAM, cmap_to_glyph(S_goodpos))
}

/**
 * C ref: apply.c dojump — physical jump.
 */
export async function dojump() {
    return jump(0);
}

/**
 * C ref: apply.c jump(magic)
 * Named omissions: SPE_JUMPING fallback; steed stuck; swallow/water/ustuck/
 * levitation/encumbrance/hunger/wounded-legs trap-escape arms; hurtle_step
 * body (monster bump) — success path uses teleds after walk_path always-true
 * hurtle stub.
 */
export async function jump(magic) {
    const u = game.u || {};

    // Spell fallback deferred — knights have Jumping.
    if (!magic && !Jumping()) {
        await pline("You can't jump very far.");
        return ECMD_OK;
    }
    if (u.uswallow) {
        if (magic) {
            await pline('You bounce around a little.');
            return ECMD_TIME;
        }
        await pline("You've got to be kidding!");
        return ECMD_OK;
    }
    if (u.uinwater) {
        if (magic) {
            await pline('You swish around a little.');
            return ECMD_TIME;
        }
        await pline('This calls for swimming, not jumping!');
        return ECMD_OK;
    }
    if (u.ustuck) {
        await pline(`You cannot escape from ${mon_nam(u.ustuck)}!`);
        return ECMD_OK;
    }
    if (u.Levitation || u.HLevitation || u.ELevitation) {
        if (magic) {
            await pline('You flail around a little.');
            return ECMD_TIME;
        }
        await pline("You don't have enough traction to jump.");
        return ECMD_OK;
    }

    await pline('Where do you want to jump?');
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    game.jumping_is_magic = magic | 0;
    getpos_sethilite(display_jump_positions, get_valid_jump_position);
    if ((await getpos(cc, true, 'the desired position')) < 0) {
        return ECMD_CANCEL;
    }
    if (!(await is_valid_jump_pos(cc.x, cc.y, magic, true))) {
        return ECMD_FAIL;
    }
    if (u.usteed && (u.ux | 0) === (cc.x | 0) && (u.uy | 0) === (cc.y | 0)) {
        await pline(`${Monnam(u.usteed)} isn't capable of jumping in place.`);
        return ECMD_FAIL;
    }

    // Same-spot / trap-escape arms deferred — seed path jumps elsewhere.
    if ((u.ux | 0) === (cc.x | 0) && (u.uy | 0) === (cc.y | 0)) {
        await pline('You decide not to jump after all.');
        return ECMD_OK;
    }

    const uc = { x: u.ux | 0, y: u.uy | 0 };
    let range = Math.abs((cc.x | 0) - (uc.x | 0));
    const temp = Math.abs((cc.y | 0) - (uc.y | 0));
    if (range < temp) range = temp;
    // C: walk_path(..., hurtle_jump, &range) — hurtle body deferred;
    // always-true keeps dest so teleds lands on the chosen cell.
    walk_path(uc, cc, () => true, range);
    await teleds(cc.x, cc.y, TELEDS_NO_FLAGS);
    nomul(-1);
    if (!game.multi_reason) game.multi_reason = 'jumping around';
    game.nomovemsg = '';
    morehungry(rnd(25));
    return ECMD_TIME;
}

/**
 * C ref: apply.c catch_lit — fire-damage ignition of light sources.
 * Named omissions: shop check_unpaid / SetVoice verbalize / bill_dummy;
 * set_msg_xy floor msg cursor.
 * @returns {Promise<boolean>}
 */
export async function catch_lit(obj) {
    if (!obj || obj.lamplit) return false;
    const {
        ignitable, age_is_relative, get_obj_location, begin_burn,
    } = await import('./timeout.js');
    if (!ignitable(obj)) return false;
    const loc = get_obj_location(obj, 0);
    if (!loc) return false;

    const t = obj.otyp | 0;
    if (((t === MAGIC_LAMP || t === CANDELABRUM_OF_INVOCATION)
            && (obj.spe | 0) === 0)
        || (age_is_relative(obj) && (obj.age | 0) === 0)
        || t === BRASS_LANTERN) {
        return false;
    }
    if (t === CANDELABRUM_OF_INVOCATION && obj.cursed) return false;
    if ((t === OIL_LAMP || t === MAGIC_LAMP) && obj.cursed && !rn2(2)) {
        return false;
    }

    const u = game.u || {};
    const Blind = !!((u.HBlind | 0) || (u.EBlind | 0) || u.Blind
        || ((u.HBlinded | 0) & TIMEOUT) || (u.EBlinded | 0));
    const invent = obj.where === OBJ_INVENT
        || (game.invent || []).includes(obj);
    if (invent || cansee(loc.x, loc.y)) {
        // set_msg_xy deferred
        const nm = invent
            ? (() => {
                const s = `your ${xname(obj)}`;
                return s.charAt(0).toUpperCase() + s.slice(1);
            })()
            : (() => {
                const s = xname(obj);
                return s.charAt(0).toUpperCase() + s.slice(1);
            })();
        const verb = Blind ? 'feel' : 'catch';
        const tensed = ((obj.quan | 0) !== 1)
            ? verb
            : (/[sxz]$/.test(verb) || /(?:ch|sh)$/.test(verb)
                ? `${verb}es`
                : `${verb}s`);
        await pline(`${nm} ${tensed} ${Blind ? 'warm.' : 'light!'}`);
    }
    if (t === POT_OIL) makeknown(obj.otyp);
    // shop unpaid bill deferred (check_unpaid / verbalize / bill_dummy)
    begin_burn(obj, false);
    return true;
}
