// engrave.js — the 'E' engrave command.
// C ref: nethack-c/src/engrave.c doengrave() (engrave.c:958) and the engrave()
// occupation callback (engrave.c:1268).
//
// This module ports the player engrave command.  The DUST / bare-fingertip path
// dust with a fingertip) is ported leaf-for-leaf against C.  The wand/ring/gem/
// weapon/marker stylus paths and the blind/confused/swallowed/altar/grave special
// cases are guarded with C-ref comments and conservative C-faithful defaults; the
// RNG-bearing pieces those paths reach (wand-explode, wrest-charge, marker ink)
//
// Engraving runs as a moveloop occupation (set_occupation(engrave)): doengrave()
// does the stylus/text/smudge setup and consumes NO time itself; the per-character
// engraving and the post-setup world turn run in the occupation driver in
// allmain.js (modelled on the dig/learn drivers).  C ref: allmain.c:543-558.

import { check_unpaid_usage } from './shk.js';
import { game } from './gstate.js';
import { rn1, rn2, rnd } from './rng.js';
import { goodpos } from './trap.js';
import { is_pool } from './look.js';
import { LAVAPOOL, LAVAWALL, CLOUD, IS_FOUNTAIN, IS_AIR, ACCESSIBLE } from './const.js';
import { permonstTemplate } from './makemon.js';
import { nhgetch } from './input.js';
import { pline, flush_screen, newsym } from './display.js';
import { topl_park_cursor } from './display.js';
import { getlin } from './wizcmds.js';
import { zappable, zapnodir, learnwand, make_blinded } from './zap.js';
import { resists_blnd } from './mhitm.js';
import { yn_function } from './end.js';
import { getObjFromGetobj, welded, body_part, surface as surface_real, ceiling,
         Yname2, is_blade, is_art } from './cmd.js';
import { bimanual, is_boots } from './do_wear.js';
import { Yobjnam2, doname, xname, Tobjnam, otense } from './objnam.js';
import { useup, altar_wrath, check_capacity } from './cmd.js';
import { GETOBJ_PROMPT, HAND } from './const.js';
import { exercise } from './attrib.js';
import { more_experienced } from './exper.js';
import { can_reach_floor as can_reach_floor_real } from './hold_another_object.js';
import { make_engr_at, del_engr_at, engr_at, random_engraving } from './mklev.js';
import { DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, HEADSTONE, A_WIS,
         ECMD_OK, ECMD_CANCEL, ECMD_FAIL, ECMD_TIME, ICE, IS_ALTAR,
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

function body_part_fingertip() { return 'fingertip'; }
function body_part_hand() { return 'hand'; }

function surface(x, y) { return surface_real(x, y); }
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

async function u_can_engrave() {
    const u = game.u || {};
    if (u.uswallow) {
        return false;
    }
    /* C engrave.c:520-533 — terrain arms */
    const lev = game.level?.at?.(u.ux, u.uy);
    const levtyp = lev ? (lev.typ | 0) : 0;
    if (lev) {
        if (levtyp === LAVAPOOL || levtyp === LAVAWALL) {
            await pline(`You can't write on the ${surface_real(u.ux, u.uy)}!`);
            return false;
        } else if (is_pool(u.ux, u.uy) || IS_FOUNTAIN(levtyp)) {
            await pline(`You can't write on the ${surface_real(u.ux, u.uy)}!`);
            return false;
        } else if (IS_AIR(levtyp)) {
            await pline(`You can't write in ${levtyp === CLOUD ? 'cloud vapor' : 'thin air'}!`);
            return false;
        } else if (!ACCESSIBLE(levtyp)) {
            await pline("You can't write here.");
            return false;
        }
    }
    /* C engrave.c:532 cantwield(gy.youmonst.data) = nohands || verysmall (mondata.h:96) */
    const ym = (game.youmonst && game.youmonst.data)
        || (u.umonnum != null ? permonstTemplate(u.umonnum | 0) : null);
    if (ym && (((ym.mflags1 | 0) & 0x00002000) !== 0 || (ym.msize | 0) < 1)) {
        await pline("You can't even hold anything!");
        return false;
    }
    if (check_capacity(null)) /* C engrave.c:536 */
        return false;
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


const GRAVE_TYP = 31; /* const.js GRAVE */

async function The_xname(obj) {
    const x = await xname(obj);
    return 'The ' + x;
}

/* C engrave.c:583 doengrave_sfx_item_WAN — special effects for wands.
 * Not ported: WAN_POLYMORPH's random_engraving/blengr rewrite, doknown's
 * learnwand(), and the lightning blindness (doblind) — no JS bodies here. */
function wandNameKnown(o) {
    return !!game._oc_name_known?.[o.otyp | 0];
}

/* C engrave.c:1663-1677 rloc_engr — the store is keyed by (x,y), so "move" is
 * delete-at-old + recreate-at-new (mirrors js/zap.js _zap_rloc_engr). */
function rloc_engr(ep, x, y) {
    let tx, ty, tryct = 200;
    do {
        if (--tryct < 0)
            return null;
        tx = rn1(80 - 3, 2);
        ty = rn2(21);
    } while (engr_at(tx, ty) || !goodpos(tx, ty, null, 0));
    del_engr_at(x, y);
    make_engr_at(tx, ty, ep.text, ep.pristine, 0, ep.engr_type);
    newsym(tx, ty);
    return engr_at(tx, ty);
}

async function doengrave_sfx_item_WAN(de) {
    const u = game.u || {};
    const blind = uBlind(u);
    const surf = surface_real(u.ux, u.uy);
    switch (de.otmp.otyp) {
    case 410: case 411: case 415: case 413: case 414: case 412:
        await zapnodir(de.otmp);
        break;
    case 417:
        de.post_engr_text = 'The wand unsuccessfully fights your attempt to write!';
        break;
    case 424: /* WAN_TELEPORTATION (engrave.c:675-682) */
        if (de.oep && de.oep.engr_type !== HEADSTONE) {
            if (!blind) await pline(`The engraving on the ${surf} vanishes!`);
            de.teleengr = true;
        }
        break;
    case 422: /* WAN_POLYMORPH (engrave.c:618-634) */
        if (de.oep) {
            if (!blind) {
                de.type = 0; /* random */
                const re = random_engraving();
                de.buf = re.text;
                de.ebuf = re.pristine;
            }
            /* blind arm (blengr/xcrypt) not ported */
            de.dengr = true;
        }
        break;
    case 419:
        if (!blind) de.post_engr_text = `The bugs on the ${surf} slow down!`;
        break;
    case 420:
        if (!blind) de.post_engr_text = `The bugs on the ${surf} speed up!`;
        break;
    case 429:
        de.ptext = true;
        if (!blind) de.post_engr_text = `The ${surf} is riddled by bullet holes!`;
        break;
    case 432: case 433:
        if (!blind) de.post_engr_text = `The bugs on the ${surf} stop moving!`;
        break;
    case 431:
        if (!blind) de.post_engr_text = 'A few ice cubes drop from the wand.';
        if (!de.oep || de.oep.engr_type !== BURN) break;
        /* FALLTHRU */
    case 423: case 418:
        if (de.oep && de.oep.engr_type !== HEADSTONE) {
            if (!blind) await pline(`The engraving on the ${surf} vanishes!`);
            de.dengr = true;
        }
        break;
    case 428: /* WAN_DIGGING */
        de.ptext = true;
        de.type = ENGRAVE;
        if (!wandNameKnown(de.otmp)) {
            if (game.flags?.verbose !== false)
                await pline(`This ${await xname(de.otmp)} is a wand of digging!`);
            de.doknown = true;
        }
        de.post_engr_text = blind ? 'You feel tremors.'
            : game.level?.locations?.[u.ux]?.[u.uy]?.typ === GRAVE_TYP
                ? 'Chips fly out from the headstone.'
            : de.frosted ? 'Ice chips fly up from the ice surface!'
            : 'Gravel flies up from the floor.';
        break;
    case 430: /* WAN_FIRE */
        de.ptext = true;
        de.type = BURN;
        if (!wandNameKnown(de.otmp)) {
            if (game.flags?.verbose !== false)
                await pline(`This ${await xname(de.otmp)} is a wand of fire!`);
            de.doknown = true;
        }
        de.post_engr_text = blind ? 'You feel the wand heat up.' : 'Flames fly from the wand.';
        break;
    case 434: /* WAN_LIGHTNING */
        de.ptext = true;
        de.type = BURN;
        if (!wandNameKnown(de.otmp)) {
            if (game.flags?.verbose !== false)
                await pline(`This ${await xname(de.otmp)} is a wand of lightning!`);
            de.doknown = true;
        }
        if (!blind) {
            de.post_engr_text = 'Lightning arcs from the wand.';
            de.doblind = true;
        } else {
            de.post_engr_text = 'You hear crackling!';
        }
        break;
    default:
        break;
    }
}

/* doengrave — the 'E' command.  C ref: engrave.c:958.
 * Returns an ECMD_* code; sets g.occupation = 'engrave' when text is to be written.
 * The hero state struct `de` mirrors C's _doengrave_ctx. */
export async function doengrave() {
    const g = game;
    const u = g.u || {};

    if (!(await u_can_engrave())) {
        return ECMD_FAIL;
    }

    /* C engrave.c:969-973 — doengrave_ctx_init(de); gm.multi = 0. */
    const de = {
        dengr: false, doblind: false, doknown: false, eow: false, jello: false,
        ptext: true, teleengr: false, zapwand: false, disprefresh: false,
        adding: false, post_engr_text: '',
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
        de.writer = de.otmp.writerName || 'it';
    }

    /* C engrave.c:993 — the wielded or worn stylus is still usable. */
    if (!freehand() && de.otmp !== u.uwep && !de.otmp.owornmask) {
        await pline(`You have no free ${body_part(HAND)} to write with!`);
        return doengr_exit(de);
    }

    let initial_msg_given = false;
    if (!can_reach_floor_real(true)) {
        if ((de.otmp.oclass | 0) !== WAND_CLASS) {
            await cant_reach_floor(u.ux, u.uy, false, true, false);
            return doengr_exit(de);
        }
        await pline(`You gesture, with your wand, towards the ${surface(u.ux, u.uy)} below you.`);
        initial_msg_given = true;
    }
    if (IS_ALTAR(game.level?.locations?.[u.ux]?.[u.uy]?.typ)) {
        if (!initial_msg_given)
            await pline(`You make a motion towards the altar with ${de.writer}.`);
        await altar_wrath(u.ux, u.uy);
        return doengr_exit(de);
    }

    /* C engrave.c:doengrave_sfx_item. Fingers leave the type unchanged. */
    if (!de.otmp.hands) {
        const oc = de.otmp.oclass | 0;
        if (oc === WAND_CLASS) {
            /* C engrave.c:791-815.  zappable() spends the charge HERE, before
             * the "You write in the dust with <wand>" message doname()s it. */
            if (zappable(de.otmp)) {
                /* C engrave.c:793 check_unpaid() = check_unpaid_usage(otmp, FALSE)
                 * (shk.c:5739).  The cursed WAND_BACKFIRE_CHANCE wand_explode()
                 * arm (engrave.c:794-798) is not ported: wand_explode has no JS body. */
                check_unpaid_usage(de.otmp, false);
                if (de.otmp.cursed && !rn2(100)) { /* WAND_BACKFIRE_CHANCE */
                    de.ret = ECMD_TIME;
                    return doengr_exit(de);
                }
                de.zapwand = true;
                if (!can_reach_floor_real(true)) de.ptext = false;
                await doengrave_sfx_item_WAN(de);
            } else {
                de.ptext = false;
                if (can_reach_floor_real(true)) {
                    if ((de.otmp.spe | 0) < 0) de.zapwand = true;
                    else await pline('The wand is too worn out to engrave.');
                }
            }
        } else if (oc === FOOD_CLASS || oc === SCROLL_CLASS || oc === SPBOOK_CLASS) {
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
        } else if (oc === TOOL_CLASS) {
            /* C engrave.c:836-880 */
            if (de.otmp === (game.u || {}).ublindf) {
                await pline("That is a bit difficult to engrave with, don't you think?");
                de.ret = ECMD_FAIL;
                return doengr_exit(de);
            }
            if (de.otmp.otyp === MAGIC_MARKER) {
                if ((de.otmp.spe | 0) <= 0)
                    await pline('Your marker has dried out.');
                else
                    de.type = MARK;
            } else if (de.otmp.otyp === TOWEL) {
                /* Can't really engrave with a towel.  The wet-towel
                 * dry_a_towel() arm (engrave.c:858-859) has no JS body. */
                de.ptext = false;
                const verbs = `${await Yobjnam2(de.otmp, 'get')} ${de.frosted ? 'frosty' : 'dusty'}.`;
                if (de.oep) {
                    if (de.oep.engr_type === DUST || de.oep.engr_type === ENGR_BLOOD
                        || de.oep.engr_type === MARK) {
                        if (!uBlind(game.u || {})) await pline('You wipe out the message here.');
                        else await pline(verbs);
                        de.dengr = true;
                    } else {
                        await pline(`${await Yname2(de.otmp)} can't wipe out this engraving.`);
                    }
                } else {
                    await pline(verbs);
                }
            }
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
    if (de.teleengr) {
        const moved = rloc_engr(de.oep, u.ux, u.uy);
        const o = moved || de.oep;
        o.eread = 0;
        o.erevealed = 0;
        de.disprefresh = true;
        de.oep = null;
    }
    if (de.dengr) {
        del_engr_at(u.ux, u.uy);
        de.oep = null;
        de.disprefresh = true;
    }
    if (de.buf) {
        make_engr_at(u.ux, u.uy, de.buf, de.ebuf, game.moves | 0, de.type);
        const tmp_ep = engr_at(u.ux, u.uy);
        if (!uBlind(u) && tmp_ep) {
            await pline(`The engraving now reads: "${de.buf}".`);
            tmp_ep.eread = 1;
            tmp_ep.erevealed = 1;
            de.disprefresh = true;
        }
        de.ptext = false;
    }
    /* C engrave.c:1087-1097 — a cancelled wand turns to dust. */
    if (de.zapwand && (de.otmp.spe | 0) < 0) {
        await pline(`${await The_xname(de.otmp)} ${uBlind(u) ? '' : 'glows violently, then '}turns to dust.`);
        if (game.level?.locations?.[u.ux]?.[u.uy]?.typ !== GRAVE_TYP)
            await pline('You are not going to get anywhere trying to write in the '
                        + `${de.frosted ? 'frost' : 'dust'} with your dust.`);
        await useup(de.otmp);
        de.otmp = null;
        de.ptext = false;
    }
    if (!de.ptext) {
        if (de.otmp && (de.otmp.oclass | 0) === WAND_CLASS
            && !can_reach_floor_real(true))
            await cant_reach_floor(u.ux, u.uy, false, true, true);
        de.ret = ECMD_TIME;
        return doengr_exit(de);
    }

    /* C engrave.c:1053-1057 — identify stylus. */
    if (de.doknown) {
        learnwand(de.otmp);
        if (game._oc_name_known?.[de.otmp.otyp | 0])
            more_experienced(0, 10);
    }
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
                await pline(`You cannot wipe out the message that is ${oldKind} the ${surface(u.ux, u.uy)} here.`);
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
        if (de.zapwand) {
            if (!uBlind(u))
                await pline(`${await Tobjnam(de.otmp, 'glow')}, then ${otense(de.otmp, 'fade')}.`);
            de.ret = ECMD_TIME;
            return doengr_exit(de);
        }
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

    if (de.post_engr_text) await pline(de.post_engr_text);
    /* C engrave.c:1248-1255 */
    if (de.doblind && !resists_blnd(game.youmonst)) {
        await pline('You are blinded by the flash!');
        await make_blinded(rnd(50), false);
        if (!uBlind(u)) await pline('Your vision quickly clears.');
    }

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

export function engrave() {
    const g = game;
    const u = g.u || {};
    const eng = g.context && g.context.engraving;
    if (!eng) return 0;

    /* C engrave.c:1288 — teleported away from the engrave square → abort. */
    if (eng.pos.x !== u.ux || eng.pos.y !== u.uy) {
        return 0;
    }

    const firsttime = (eng.actionct === 0);
    const neweng = (eng.actionct === 0);
    eng.actionct++;

    /* C engrave.c:1322-1331 — compute rate.  DUST/fingertip → default rate 10. */
    let rate = 10;
    const stylus = eng.stylus;
    const marker = !!(stylus && stylus.otyp === MAGIC_MARKER && eng.type === MARK);
    if (marker) {
        /* C engrave.c:1326-1328 — one charge / 2 letters */
        rate = Math.min(rate, (stylus.spe | 0) * 2);
    }

    /* C engrave.c:1333-1339 — endc = last char engraved this action. */
    let text = eng.text;
    let i = rate;
    let endc = eng.nextc;
    while (endc < text.length && i > 0) {
        if (text[endc] !== ' ') i--;
        endc++;
    }

    /* C engrave.c:1394-1408 — marker ink: max(rate/2, 1) charges per action */
    let truncate = false;
    if (marker) {
        let ink_cost = Math.max(Math.trunc(rate / 2), 1);
        if ((stylus.spe | 0) < ink_cost) {
            ink_cost = stylus.spe | 0;
            truncate = true;
        }
        stylus.spe = (stylus.spe | 0) - ink_cost;
        if ((stylus.spe | 0) === 0) {
            void pline('Your marker dries out.');
            truncate = true;
        }
    }
    /* C engrave.c:1455-1460 — worn-out stylus truncates the input */
    if (truncate && endc < text.length) {
        text = text.slice(0, endc);
        eng.text = text;
        void pline(`You are only able to write "${text.slice(0, endc)}".`);
    }

    /* C engrave.c:1438-1462 — append the engraved slice to any existing engraving. */
    let buf = '';
    let oep = engr_at(u.ux, u.uy);
    if (oep) buf = oep.text || '';
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
        /* C engrave.c:1411-1432 */
        const ice = is_ice(u.ux, u.uy);
        let finishverb;
        switch (eng.type) {
        case DUST: finishverb = ice ? 'writing in the frost' : 'writing in the dust'; break;
        case HEADSTONE: case ENGRAVE: finishverb = 'engraving'; break;
        case BURN: finishverb = ice ? 'melting your message into the ice'
                                    : 'burning your message into the floor'; break;
        case MARK: finishverb = 'defacing the dungeon'; break;
        case ENGR_BLOOD: finishverb = 'scrawling'; break;
        default: finishverb = 'your weird engraving';
        }
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
