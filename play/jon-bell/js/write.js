// write.js — C ref: write.c.
import { exercise } from './attrib.js';
import { GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, OCLASS_SCROLL, OCLASS_SPBOOK, Role_if, You_cant, Your, _cmd_Hallucination, _hero_Blind, _hero_nohands, _uprop_active, check_unpaid, getObjFromGetobj, makeknown, useup, ysimple_name } from './cmd.js';
import { A_WIS, ECMD_CANCEL, ECMD_OK, ECMD_TIME, GETOBJ_NOFLAGS, LL_CONDUCT, MAXULEV } from './const.js';
import { dropx } from './do.js';
import { You, fingers_or_gloves } from './do_wear.js';
import { game } from './gstate.js';
import { mungspaces, upstart } from './hacklib.js';
import { hold_another_object } from './invent.js';
import { update_inventory } from './inventory_refresh.js';
import { bcsign, mksobj, wipeout_text } from './mklev.js';
import { MKOBJ_SVB_BASES } from './mkobj_data.js';
import { observe_object } from './o_init.js';
import { objName as _objName_full, The as _objnam_The, Tobjnam as _objnam_Tobjnam, an, aobjnam, getObjDescr } from './objnam.js';
import { livelog_printf, pline } from './pline.js';
import { PM_WIZARD as _FL_PM_WIZARD } from './pm.generated.js';
import { rn1, rn2, rnl } from './rng.js';
import { obfree } from './shk.js';
import { known_spell } from './spell.js';
import { getlin } from './windows.js';

const _WRITE_SCR_BLANK_PAPER = 365, _WRITE_SPE_BLANK_PAPER = 407;

const _WRITE_SPE_NOVEL = 408;

/* C ref: write.c:37-45 write_ok(obj) — dowrite's getobj classifier.  Only blank
 * paper is SUGGESTed, so a hero carrying nothing but written scrolls prompts
 * "[*]" (every scroll is DOWNPLAY, i.e. altlets, not lets). */
function _write_ok(obj) {
    const oc = obj ? (obj.oclass | 0) : -1;
    if (!obj || (oc !== OCLASS_SCROLL && oc !== OCLASS_SPBOOK))
        return GETOBJ_EXCLUDE;
    const otyp = obj.otyp | 0;
    if (otyp === _WRITE_SCR_BLANK_PAPER || otyp === _WRITE_SPE_BLANK_PAPER)
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

export async function dowrite(pen) {
    const g = game;
    const u = g.u = g.u || {};
    g.context = g.context || {};

    /* C write.c:87-95 — nohands / Glib. */
    if (_hero_nohands()) {
        await pline('You need hands to be able to write!');
        return ECMD_OK;
    } else if (_uprop_active('GLIB')) {
        /* C write.c:91-94 */
        await pline(`${_objnam_Tobjnam(pen, 'slip')} from your ${fingers_or_gloves(false)}.`);
        await dropx(pen);
        return ECMD_TIME;
    }

    const paper = await getObjFromGetobj('write on', _write_ok, GETOBJ_NOFLAGS);
    /* C write.c:99-100 — `if (!paper) return ECMD_CANCEL;` */
    if (!paper)
        return ECMD_CANCEL;
    g._pending_message = '';

    /* C write.c:102-105 — the noun used in every message below. */
    const typeword = ((paper.otyp | 0) === _WRITE_SPE_NOVEL) ? 'book'
        : ((paper.oclass | 0) === OCLASS_SPBOOK) ? 'spellbook' : 'scroll';

    /* C write.c:106-116 — Blind guards.  If the hero is blind and doesn't
     * know the paper, or is blind and trying to write a spellbook, bail. */
    if (_hero_Blind()) {
        if (!paper.dknown) {
            await You(`don't know whether that ${typeword} is blank or not.`);
            return ECMD_OK;
        } else if ((paper.oclass | 0) === OCLASS_SPBOOK) {
            /* can't write a magic book while blind */
            await pline(`${upstart((await ysimple_name(pen)))} can't create braille text.`);
            return ECMD_OK;
        }
    }

    /* C write.c:117-121 — an already-written scroll or book. */
    observe_object(paper);
    if ((paper.otyp | 0) !== _WRITE_SCR_BLANK_PAPER
        && (paper.otyp | 0) !== _WRITE_SPE_BLANK_PAPER) {
        await pline(`That ${typeword} is not blank!`);
        exercise(A_WIS, false);
        return ECMD_TIME;
    }

    /* C write.c:122 */
    makeknown(_WRITE_SCR_BLANK_PAPER);

    /* C write.c:124-132 — what to write. */
    const qbuf = `What type of ${typeword} do you want to write?`;
    let namebuf = await getlin(qbuf);
    namebuf = mungspaces(namebuf || '');
    if (namebuf[0] === '\x1b' || !namebuf)
        return ECMD_TIME;
    let nm = namebuf;
    if (/^scroll /i.test(nm)) nm = nm.slice(7);
    else if (/^spellbook /i.test(nm)) nm = nm.slice(10);
    if (/^of /i.test(nm)) nm = nm.slice(3);
    /* C write.c:140-143 — " armour" -> " armor " then mungspaces. */
    {
        const lc = nm.toLowerCase();
        const k = lc.indexOf(' armour');
        if (k >= 0)
            // C write.c:139-141 keeps bp's space and munges from bp + 1.
            nm = nm.slice(0, k) + ' ' + mungspaces('armor ' + nm.slice(k + 7));
    }

    const g2 = game;
    let by_descr = false, deferred = 0, real = 0, deferralchance = 0, i = 0;
    let found = false;
    const pclass = paper.oclass | 0;
    const first = MKOBJ_SVB_BASES[pclass];
    const last = MKOBJ_SVB_BASES[pclass + 1] - 1;
    const nml = nm.toLowerCase();
    /* first loop: name/description (write.c:151-176) */
    for (i = first; i <= last; i++) {
        const oname_ = _objName_full(i);
        if (oname_ == null)
            continue;
        if (oname_.toLowerCase() === nml) {
            if ((g2._oc_name_known && g2._oc_name_known[i]) || pclass === OCLASS_SPBOOK) {
                found = true;
                break;
            } else {
                real = deferred = i;
                break;
            }
        }
        const od = getObjDescr(i);
        if (od != null && od.toLowerCase() === nml) {
            by_descr = true;
            found = true;
            break;
        }
    }
    if (!found) {
        /* second loop: user-assigned names (write.c:181-205) */
        for (i = first; i <= last; i++) {
            const un = g2._oc_uname && g2._oc_uname[i];
            if (un != null && String(un).toLowerCase() === nml
                && !(real && g2._oc_name_known && g2._oc_name_known[i])
                && !rn2(++deferralchance)) {
                deferred = i;
                by_descr = true;
            }
        }
        if (deferred) {
            i = deferred;
        } else {
            await pline(`There is no such ${typeword}!`);
            return ECMD_TIME;
        }
    }

    /* found: (write.c:209) */
    if (i === _WRITE_SCR_BLANK_PAPER || i === _WRITE_SPE_BLANK_PAPER) {
        await You_cant("write that!");
        await pline("It's obscene!");
        return ECMD_TIME;
    } else if (i === _WRITE_SPE_NOVEL) {
        const fanfic = !rn2(3), tearup = !rn2(3);
        if (!fanfic) {
            await You(`${!tearup ? 'prepare' : 'try'} to write the Great Yendorian Novel, but ${!_cmd_Hallucination() ? 'lack' : 'have too much'} inspiration.`);
        } else {
            await You(`${!tearup ? 'start to ' : ''}produce really ${!_cmd_Hallucination() ? 'lame' : 'awesome'} fan-fiction.`);
        }
        if (!tearup) {
            await You('give up on the idea.');
        } else {
            await You('tear it up.');
            await useup(paper);
        }
        return ECMD_TIME;
    } else if (i === 409 /* SPE_BOOK_OF_THE_DEAD */) {
        await pline('No mere dungeon adventurer could write that.');
        return ECMD_TIME;
    } else if (by_descr && pclass === OCLASS_SPBOOK
               && !(g2._oc_name_known && g2._oc_name_known[i])) {
        await pline("Unfortunately you don't have enough information to go on.");
        return ECMD_TIME;
    }

    /* KMH, conduct (write.c:241) */
    u.uconduct = u.uconduct || {};
    if (!(u.uconduct.literate | 0)) {
        u.uconduct.literate = 1;
        livelog_printf(LL_CONDUCT, `became literate by writing ${an(typeword)}`);
    } else {
        u.uconduct.literate++;
    }

    const new_obj = await mksobj(i, false, false);
    new_obj.bknown = !!(paper.bknown && pen.bknown);

    /* shk imposes a flat rate per use (write.c:250) */
    check_unpaid(pen);

    /* see if there's enough ink (write.c:253) */
    const basecost = _write_cost(new_obj);
    if ((pen.spe | 0) < Math.trunc(basecost / 2)) {
        await Your('marker is too dry to write that!');
        await obfree(new_obj, null);
        return ECMD_TIME;
    }

    /* write.c:261 — really going to write now */
    const actualcost = rn1(Math.trunc(basecost / 2), Math.trunc(basecost / 2));
    const curseval = bcsign(pen) + bcsign(paper);
    exercise(A_WIS, true);
    /* dry out marker */
    if ((pen.spe | 0) < actualcost) {
        pen.spe = 0;
        await Your('marker dries out!');
        if (pclass === OCLASS_SPBOOK) {
            await pline('The spellbook is left unfinished and your writing fades.');
            update_inventory();
        } else {
            await pline('The scroll is now useless and disappears!');
            await useup(paper);
        }
        await obfree(new_obj, null);
        return ECMD_TIME;
    }
    pen.spe = (pen.spe | 0) - actualcost;

    /* write.c:313 */
    const spell_knowledge = (pclass === OCLASS_SPBOOK) ? known_spell(new_obj.otyp) : 0;
    const nk = new_obj.otyp | 0;
    if (!(g2._oc_name_known && g2._oc_name_known[nk])
        && !(by_descr && g2._oc_encountered && g2._oc_encountered[nk])
        && spell_knowledge !== 1 /* spe_Fresh */
        && rnl(((Role_if(_FL_PM_WIZARD) && pclass !== OCLASS_SPBOOK)
                || spell_knowledge === 2 /* spe_GoingStale */) ? 5 : 15)) {
        await You(`${by_descr ? 'fail' : "don't know how"} to write that.`);
        if (pclass === OCLASS_SPBOOK) {
            await You('write in your best handwriting:  "My Diary", but it quickly fades.');
            update_inventory();
        } else {
            if (by_descr) {
                namebuf = wipeout_text(getObjDescr(nk), Math.trunc((6 + MAXULEV - (u.ulevel | 0)) / 6), 0);
            } else
                namebuf = `${g2.plname} was here!`;
            await You(`write "${namebuf}" and the scroll disappears.`);
            await useup(paper);
        }
        await obfree(new_obj, null);
        return ECMD_TIME;
    }
    /* write.c:344 — blind writing needs luck too */
    if (_hero_Blind() && rnl(3)) {
        await You('fail to write the scroll correctly and it disappears.');
        await useup(paper);
        await obfree(new_obj, null);
        return ECMD_TIME;
    }

    /* use up old scroll / spellbook (write.c:358) */
    await useup(paper);

    /* success */
    if (new_obj.oclass === OCLASS_SPBOOK) {
        const descr = getObjDescr(nk);
        const comp = ['parchment', 'vellum', 'cloth'].includes(String(descr).toLowerCase());
        await pline(`The spellbook warps strangely, then turns ${comp ? 'into ' : ''}${descr}.`);
    }
    new_obj.blessed = curseval > 0;
    new_obj.cursed = curseval < 0;
    if (nk === 364 /* SCR_MAIL */)
        new_obj.spe = 2;
    new_obj.dknown = false;
    if ((g2._oc_name_known && g2._oc_name_known[nk]) || by_descr)
        observe_object(new_obj);

    await hold_another_object(new_obj, 'Oops!  %s out of your grasp!',
                              _objnam_The(await aobjnam(new_obj, 'slip')), null);
    return ECMD_TIME;
}

/* C ref: write.c:16-60 cost(otmp) — base ink cost of a scroll or spellbook. */
const _WRITE_SPBOOK_LEVEL = [5,2,4,4,3,7,1,1,1,1,1,1,2,2,2,2,2,2,3,3,3,5,3,3,4,3,4,4,4,3,5,3,6,6,6,6,7,1,1,3,2,0,1,7];

const _WRITE_COST_BY_NAME = {
    'mail': 2,
    'light': 8, 'gold detection': 8, 'food detection': 8, 'magic mapping': 8,
    'amnesia': 8, 'fire': 8, 'earth': 8,
    'destroy armor': 10, 'create monster': 10, 'punishment': 10,
    'confuse monster': 12, 'identify': 14,
    'enchant armor': 16, 'remove curse': 16, 'enchant weapon': 16, 'charging': 16,
    'scare monster': 20, 'stinking cloud': 20, 'taming': 20, 'teleportation': 20,
    'genocide': 30,
};

function _write_cost(otmp) {
    if ((otmp.oclass | 0) === OCLASS_SPBOOK) {
        const k = (otmp.otyp | 0) - 366;
        return 10 * ((k >= 0 && k < _WRITE_SPBOOK_LEVEL.length) ? _WRITE_SPBOOK_LEVEL[k] : 1);
    }
    const c = _WRITE_COST_BY_NAME[_objName_full(otmp.otyp | 0)];
    return c != null ? c : 1000;
}
