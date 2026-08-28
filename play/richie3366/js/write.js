// write.js — Apply magic marker → write on blank scroll/spellbook.
// C ref: write.c dowrite / write_ok / cost / new_book_description.
//
// Branch envelope: getobj("write on") + blank-paper gates + getlin type +
// name/descr/uname match + ink cost + known/Luck write test + useup +
// hold_another_object.
// Named omissions: livelog literate conduct; check_unpaid; known_spell
// (spe_Fresh / GoingStale — treated as spe_Unknown); MAIL_STRUCTURES
// SCR_MAIL spe=2; Glib Tobjnam/fingers_or_gloves polish; novel Hallu
// wording polish; new_book_description composition "into " prefix.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import {
    SCROLL_CLASS, SPBOOK_CLASS, objectNames, objectNameStrs, objectDescrs,
} from './objects.js';
import {
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, MAXULEV,
} from './const.js';
import { compactify_invlets, makeknown, observe_object, hold_another_object, getobj_display_pickinv } from './invent.js';
import { getlin } from './getline.js';
import { rn2, rn1, rnl } from './rng.js';
import { nohands } from './monsters.js';
import { mksobj, weight } from './mkobj.js';
import { A_WIS, exercise } from './attrib.js';
import { bcsign } from './rumors.js';
import { wipeout_text } from './engrave.js';
import { dropx } from './do.js';
import { doname } from './objnam.js';
import { PM_WIZARD } from './generated/monsters_data.js';

const SCR_BLANK_PAPER = objectNames.indexOf('SCR_BLANK_PAPER');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const SCR_MAIL = objectNames.indexOf('SCR_MAIL');
const SCR_LIGHT = objectNames.indexOf('SCR_LIGHT');
const SCR_GOLD_DETECTION = objectNames.indexOf('SCR_GOLD_DETECTION');
const SCR_FOOD_DETECTION = objectNames.indexOf('SCR_FOOD_DETECTION');
const SCR_MAGIC_MAPPING = objectNames.indexOf('SCR_MAGIC_MAPPING');
const SCR_AMNESIA = objectNames.indexOf('SCR_AMNESIA');
const SCR_FIRE = objectNames.indexOf('SCR_FIRE');
const SCR_EARTH = objectNames.indexOf('SCR_EARTH');
const SCR_DESTROY_ARMOR = objectNames.indexOf('SCR_DESTROY_ARMOR');
const SCR_CREATE_MONSTER = objectNames.indexOf('SCR_CREATE_MONSTER');
const SCR_PUNISHMENT = objectNames.indexOf('SCR_PUNISHMENT');
const SCR_CONFUSE_MONSTER = objectNames.indexOf('SCR_CONFUSE_MONSTER');
const SCR_IDENTIFY = objectNames.indexOf('SCR_IDENTIFY');
const SCR_ENCHANT_ARMOR = objectNames.indexOf('SCR_ENCHANT_ARMOR');
const SCR_REMOVE_CURSE = objectNames.indexOf('SCR_REMOVE_CURSE');
const SCR_ENCHANT_WEAPON = objectNames.indexOf('SCR_ENCHANT_WEAPON');
const SCR_CHARGING = objectNames.indexOf('SCR_CHARGING');
const SCR_SCARE_MONSTER = objectNames.indexOf('SCR_SCARE_MONSTER');
const SCR_STINKING_CLOUD = objectNames.indexOf('SCR_STINKING_CLOUD');
const SCR_TAMING = objectNames.indexOf('SCR_TAMING');
const SCR_TELEPORTATION = objectNames.indexOf('SCR_TELEPORTATION');
const SCR_GENOCIDE = objectNames.indexOf('SCR_GENOCIDE');

/** C invent getobj callback ranks. */
const GETOBJ_EXCLUDE = -3;
const GETOBJ_DOWNPLAY = 1;
const GETOBJ_SUGGEST = 2;

/** C spe_Unknown — known_spell body deferred. */
const SPE_UNKNOWN = 0;

function Blind() {
    const u = game.u || {};
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

function Role_if(pm) {
    return (game.urole?.mnum | 0) === pm;
}

function strcmpi(a, b) {
    return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

function strncmpi(a, b, n) {
    return String(a || '').slice(0, n).toLowerCase()
        === String(b || '').slice(0, n).toLowerCase();
}

function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

function strstri(hay, needle) {
    const h = String(hay || '').toLowerCase();
    const n = String(needle || '').toLowerCase();
    const i = h.indexOf(n);
    return i < 0 ? null : { index: i, len: needle.length };
}

function obj_name(otyp) {
    return objectNameStrs[otyp] || null;
}

function obj_descr(otyp) {
    const oc = game.objects?.[otyp];
    if (!oc) return null;
    return objectDescrs[oc.oc_descr_idx ?? otyp] ?? null;
}

/**
 * C ref: write.c cost — base ink cost of scroll / spellbook type.
 */
function cost(otmp) {
    if (otmp.oclass === SPBOOK_CLASS) {
        return 10 * ((game.objects?.[otmp.otyp]?.oc_level) | 0);
    }
    const o = otmp.otyp;
    if (o === SCR_MAIL) return 2;
    if (o === SCR_LIGHT || o === SCR_GOLD_DETECTION || o === SCR_FOOD_DETECTION
        || o === SCR_MAGIC_MAPPING || o === SCR_AMNESIA || o === SCR_FIRE
        || o === SCR_EARTH) {
        return 8;
    }
    if (o === SCR_DESTROY_ARMOR || o === SCR_CREATE_MONSTER
        || o === SCR_PUNISHMENT) {
        return 10;
    }
    if (o === SCR_CONFUSE_MONSTER) return 12;
    if (o === SCR_IDENTIFY) return 14;
    if (o === SCR_ENCHANT_ARMOR || o === SCR_REMOVE_CURSE
        || o === SCR_ENCHANT_WEAPON || o === SCR_CHARGING) {
        return 16;
    }
    if (o === SCR_SCARE_MONSTER || o === SCR_STINKING_CLOUD
        || o === SCR_TAMING || o === SCR_TELEPORTATION) {
        return 20;
    }
    if (o === SCR_GENOCIDE) return 30;
    // SCR_BLANK_PAPER / default — C impossible
    return 1000;
}

/** C ref: write.c write_ok */
function write_ok(obj) {
    if (!obj || (obj.oclass !== SCROLL_CLASS && obj.oclass !== SPBOOK_CLASS)) {
        return GETOBJ_EXCLUDE;
    }
    if (obj.otyp === SCR_BLANK_PAPER || obj.otyp === SPE_BLANK_PAPER) {
        return GETOBJ_SUGGEST;
    }
    return GETOBJ_DOWNPLAY;
}

function write_suggest_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && write_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    return lets.join('');
}

function write_has_downplay() {
    for (const o of game.invent || []) {
        if (write_ok(o) === GETOBJ_DOWNPLAY) return true;
    }
    return false;
}

/**
 * C ref: invent.c getobj("write on", write_ok, GETOBJ_NOFLAGS)
 * DOWNPLAY-only → forceprompt `[*]`; EXCLUDE → silly thing + cancel.
 */
async function getobj_write_on() {
    const lets0 = write_suggest_lets();
    if (!lets0 && !write_has_downplay()) {
        await pline("You don't have anything to write on.");
        return null;
    }
    for (;;) {
        await flush_topl_more();
        const rawLets = write_suggest_lets();
        if (!rawLets && !write_has_downplay()) {
            await pline("You don't have anything to write on.");
            return null;
        }
        const lets = rawLets.length > 5 ? compactify_invlets(rawLets) : rawLets;
        const query = lets
            ? `What do you want to write on? [${lets} or ?*]`
            : 'What do you want to write on? [*]';
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
            // '?' uses SUGGEST lets; '*' shows full invent (altlets + rest)
            const counted = { cnt: 0, cntgiven: false };
            const ilet = await getobj_display_pickinv(
                ch, rawLets, false, counted,
                { word: 'write on', allownone: false, promptHasHands: false },
            );
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline('Never mind.');
                return null;
            }
            if (!ilet) {
                if (game.iflags?.force_invmenu) return null;
                continue;
            }
            const picked = (game.invent || []).find((o) => o.invlet === ilet);
            if (!picked) {
                await pline("You don't have that object.");
                continue;
            }
            if (write_ok(picked) === GETOBJ_EXCLUDE) {
                await pline('That is a silly thing to write on.');
                return null;
            }
            game._pending_message = '';
            return picked;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        if (write_ok(otmp) === GETOBJ_EXCLUDE) {
            await pline('That is a silly thing to write on.');
            return null;
        }
        game._pending_message = '';
        return otmp;
    }
}

/** C ref: invent.c useup — consume one from invent stack. */
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

/** Discard temporary mksobj product (C obfree). */
function obfree(obj) {
    // Not in invent — just drop reference
    void obj;
}

/**
 * C ref: write.c new_book_description — cover vs composition phrasing.
 */
function new_book_description(booktype) {
    const compositions = ['parchment', 'vellum', 'cloth'];
    const descr = obj_descr(booktype) || 'plain';
    for (const c of compositions) {
        if (strcmpi(descr, c)) return `into ${descr}`;
    }
    return descr;
}

/**
 * C ref: write.c dowrite — applying a magic marker.
 * @param {object} pen MAGIC_MARKER object
 * @returns {Promise<number>} ECMD_*
 */
export async function dowrite(pen) {
    if (nohands(game.youmonst?.data)) {
        await pline('You need hands to be able to write!');
        return ECMD_OK;
    }
    if (game.u?.Glib) {
        // Tobjnam / fingers_or_gloves polish deferred
        await pline(`${doname(pen)} slips from your fingers.`);
        await dropx(pen);
        return ECMD_TIME;
    }

    const paper = await getobj_write_on();
    if (!paper) return ECMD_CANCEL;

    const typeword = paper.otyp === SPE_NOVEL ? 'book'
        : (paper.oclass === SPBOOK_CLASS ? 'spellbook' : 'scroll');

    if (Blind()) {
        if (!paper.dknown) {
            await pline(
                `You don't know whether that ${typeword} is blank or not.`,
            );
            return ECMD_OK;
        }
        if (paper.oclass === SPBOOK_CLASS) {
            await pline("Your marker can't create braille text.");
            return ECMD_OK;
        }
    }

    observe_object(paper);
    if (paper.otyp !== SCR_BLANK_PAPER && paper.otyp !== SPE_BLANK_PAPER) {
        await pline(`That ${typeword} is not blank!`);
        exercise(A_WIS, false);
        return ECMD_TIME;
    }
    makeknown(SCR_BLANK_PAPER);

    const qbuf = `What type of ${typeword} do you want to write?`;
    let namebuf = await getlin(qbuf);
    namebuf = mungspaces(namebuf);
    if (namebuf === '\x1b' || !namebuf) return ECMD_TIME;

    let nm = namebuf;
    if (strncmpi(nm, 'scroll ', 7)) nm = nm.slice(7);
    else if (strncmpi(nm, 'spellbook ', 10)) nm = nm.slice(10);
    if (strncmpi(nm, 'of ', 3)) nm = nm.slice(3);

    const armour = strstri(nm, ' armour');
    if (armour) {
        nm = `${nm.slice(0, armour.index)} armor ${nm.slice(armour.index + armour.len)}`;
        nm = mungspaces(nm);
    }

    let deferred = 0;
    let real = 0;
    let deferralchance = 0;
    let by_descr = false;
    let i = 0;

    const first = (game.bases?.[paper.oclass] | 0);
    const last = ((game.bases?.[paper.oclass + 1] | 0) - 1);

    found: {
        for (let j = first; j <= last; j++) {
            if (!obj_name(j)) continue;
            if (strcmpi(obj_name(j), nm)) {
                const oc = game.objects?.[j];
                if (oc?.oc_name_known || paper.oclass === SPBOOK_CLASS) {
                    i = j;
                    break found;
                }
                real = deferred = j;
                break;
            }
            if (strcmpi(obj_descr(j), nm)) {
                by_descr = true;
                i = j;
                break found;
            }
        }
        for (let j = first; j <= last; j++) {
            const oc = game.objects?.[j];
            if (oc?.oc_uname && strcmpi(oc.oc_uname, nm)
                && !(real && oc.oc_name_known)
                && !rn2(++deferralchance)) {
                deferred = j;
                by_descr = true;
            }
        }
        if (deferred) {
            i = deferred;
            break found;
        }
        await pline(`There is no such ${typeword}!`);
        return ECMD_TIME;
    }

    if (i === SCR_BLANK_PAPER || i === SPE_BLANK_PAPER) {
        await pline("You can't write that!");
        await pline("It's obscene!");
        return ECMD_TIME;
    }
    if (i === SPE_NOVEL) {
        const fanfic = !rn2(3);
        const tearup = !rn2(3);
        const hallu = !!(game.u?.Hallucination);
        if (!fanfic) {
            await pline(
                `You ${!tearup ? 'prepare' : 'try'} to write the Great `
                + `Yendorian Novel, but ${!hallu ? 'lack' : 'have too much'} `
                + 'inspiration.',
            );
        } else {
            await pline(
                `You ${!tearup ? 'start to ' : ''}produce really `
                + `${!hallu ? 'lame' : 'awesome'} fan-fiction.`,
            );
        }
        if (!tearup) await pline('You give up on the idea.');
        else {
            await pline('You tear it up.');
            useup(paper);
        }
        return ECMD_TIME;
    }
    if (i === SPE_BOOK_OF_THE_DEAD) {
        await pline('No mere dungeon adventurer could write that.');
        return ECMD_TIME;
    }
    if (by_descr && paper.oclass === SPBOOK_CLASS
        && !game.objects?.[i]?.oc_name_known) {
        await pline(
            "Unfortunately you don't have enough information to go on.",
        );
        return ECMD_TIME;
    }

    // C: u.uconduct.literate++ (+ livelog deferred)
    if (!game.u) game.u = {};
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.literate = (game.u.uconduct.literate | 0) + 1;

    const new_obj = mksobj(i, false, false);
    new_obj.bknown = !!(paper.bknown && pen.bknown);

    // check_unpaid(pen) deferred

    const basecost = cost(new_obj);
    if ((pen.spe | 0) < Math.trunc(basecost / 2)) {
        await pline('Your marker is too dry to write that!');
        obfree(new_obj);
        return ECMD_TIME;
    }

    const actualcost = rn1(Math.trunc(basecost / 2), Math.trunc(basecost / 2));
    const curseval = bcsign(pen) + bcsign(paper);
    exercise(A_WIS, true);

    if ((pen.spe | 0) < actualcost) {
        pen.spe = 0;
        await pline('Your marker dries out!');
        if (paper.oclass === SPBOOK_CLASS) {
            await pline(
                'The spellbook is left unfinished and your writing fades.',
            );
        } else {
            await pline('The scroll is now useless and disappears!');
            useup(paper);
        }
        obfree(new_obj);
        return ECMD_TIME;
    }
    pen.spe = (pen.spe | 0) - actualcost;

    const spell_knowledge = SPE_UNKNOWN; // known_spell deferred
    const ocNew = game.objects?.[new_obj.otyp];
    if (!ocNew?.oc_name_known
        && !(by_descr && ocNew?.oc_encountered)
        && spell_knowledge !== 1 /* spe_Fresh */
        && rnl(((Role_if(PM_WIZARD) && paper.oclass !== SPBOOK_CLASS)
            || spell_knowledge === 2 /* spe_GoingStale */)
            ? 5 : 15)) {
        await pline(
            `You ${by_descr ? 'fail' : "don't know how"} to write that.`,
        );
        if (paper.oclass === SPBOOK_CLASS) {
            await pline(
                'You write in your best handwriting:  "My Diary", '
                + 'but it quickly fades.',
            );
        } else {
            let failbuf;
            if (by_descr) {
                failbuf = obj_descr(new_obj.otyp) || '';
                failbuf = wipeout_text(
                    failbuf,
                    Math.trunc((6 + MAXULEV - (game.u?.ulevel | 0)) / 6),
                    0,
                );
            } else {
                failbuf = `${game.plname || 'Player'} was here!`;
            }
            await pline(`You write "${failbuf}" and the scroll disappears.`);
            useup(paper);
        }
        obfree(new_obj);
        return ECMD_TIME;
    }

    if (Blind() && rnl(3)) {
        await pline(
            'You fail to write the scroll correctly and it disappears.',
        );
        useup(paper);
        obfree(new_obj);
        return ECMD_TIME;
    }

    useup(paper);

    if (new_obj.oclass === SPBOOK_CLASS) {
        await pline(
            `The spellbook warps strangely, then turns ${
                new_book_description(new_obj.otyp)}.`,
        );
    }
    new_obj.blessed = curseval > 0;
    new_obj.cursed = curseval < 0;
    if (new_obj.otyp === SCR_MAIL) new_obj.spe = 2;

    new_obj.dknown = false;
    if (ocNew?.oc_name_known || by_descr) observe_object(new_obj);

    await hold_another_object(
        new_obj,
        'Oops!  %s out of your grasp!',
        `The ${doname(new_obj)} slips`,
        null,
    );
    return ECMD_TIME;
}
