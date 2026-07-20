// readobjnam.js — Wish object parsing (partial).
// C ref: objnam.c readobjnam / rnd_otyp_by_namedesc / wishymatch

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    objectNames,
    objectNameStrs,
    objectDescrs,
    NUM_OBJECTS,
    MAXOCLASSES,
    ARMOR_CLASS,
    WEAPON_CLASS,
    WAND_CLASS,
    RING_CLASS,
    POTION_CLASS,
    SCROLL_CLASS,
    GEM_CLASS,
    AMULET_CLASS,
    SPBOOK_CLASS,
    TOOL_CLASS,
    FOOD_CLASS,
} from './objects.js';
import { mksobj, mkobj, weight, curse, oc_merge_of } from './mkobj.js';
import { artifact_name, nartifact_exist } from './artifact.js';
import { oname } from './do_name.js';
import { name_to_monplus } from './mondata.js';
import { makesingular } from './objnam.js';
import { NON_PM, LOW_PM, monsterNames } from './monsters.js';
import { ONAME_WISH, SPE_LIM } from './const.js';

const STRANGE_OBJECT = 0;
const GRAY_DRAGON = monsterNames.indexOf('PM_GRAY_DRAGON');
const YELLOW_DRAGON = monsterNames.indexOf('PM_YELLOW_DRAGON');
const GRAY_DSM = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const GRAY_DS = objectNames.indexOf('GRAY_DRAGON_SCALES');
const SCALE_MAIL = objectNames.indexOf('SCALE_MAIL');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const WAN_WISHING = objectNames.indexOf('WAN_WISHING');
const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const GOLD_SYM = '$';

/** C ref: objnam.c wrp[] / wrpsym[] — class words for wishing. */
const WRP = [
    'wand', 'ring', 'potion', 'scroll', 'gem',
    'amulet', 'spellbook', 'spell book',
    'weapon', 'armor', 'tool', 'food', 'comestible',
];
const WRPSYMS = [
    WAND_CLASS, RING_CLASS, POTION_CLASS, SCROLL_CLASS, GEM_CLASS,
    AMULET_CLASS, SPBOOK_CLASS, SPBOOK_CLASS, WEAPON_CLASS,
    ARMOR_CLASS, TOOL_CLASS, FOOD_CLASS, FOOD_CLASS,
];

/** Sentinels matching C &hands_obj / &nothing */
export const HANDS_OBJ = { _hands_obj: true };
export const NOTHING_OBJ = { _nothing_obj: true };

function wizardMode() {
    return !!(game.flags?.debug || game.flags?.wizard);
}

function Luck() {
    const u = game.u || {};
    return (u.uluck | 0) + (u.moreluck | 0);
}

function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

function fuzzymatch(u, t) {
    const norm = (x) => String(x).toLowerCase().replace(/[- ]+/g, '');
    return norm(u) === norm(t);
}

/** C ref: objnam.c wishymatch — fuzzy + "of" inversion subset. */
function wishymatch(u_str, o_str, retry_inverted) {
    if (!u_str || !o_str) return false;
    if (fuzzymatch(u_str, o_str)) return true;
    if (retry_inverted) {
        const uOf = u_str.toLowerCase().indexOf(' of ');
        const oOf = o_str.toLowerCase().indexOf(' of ');
        if (uOf >= 0 && oOf < 0) {
            const buf = `${u_str.slice(uOf + 4)} ${u_str.slice(0, uOf)}`;
            if (fuzzymatch(buf, o_str)) return true;
        } else if (oOf >= 0 && uOf < 0) {
            const buf = `${o_str.slice(oOf + 4)} ${o_str.slice(0, oOf)}`;
            if (fuzzymatch(u_str, buf)) return true;
        }
    }
    return false;
}

/** C ref: objnam.c rnd_otyp_by_namedesc */
export function rnd_otyp_by_namedesc(name, oclass, xtra_prob) {
    if (!name) return STRANGE_OBJECT;
    const check_of = !name.toLowerCase().includes(' of ');
    const objs = game.objects || [];
    let lo = MAXOCLASSES;
    let hi = NUM_OBJECTS - 1;
    if (oclass) {
        const bases = game.bases;
        if (bases) {
            lo = bases[oclass] | 0;
            hi = (bases[oclass + 1] | 0) - 1;
        }
    }
    const valid = [];
    let maxprob = 0;
    const minglob = objectNames.indexOf('GLOB_OF_GRAY_OOZE');
    const maxglob = objectNames.indexOf('GLOB_OF_BLACK_PUDDING');

    for (let i = lo; i <= hi; i++) {
        const zn = objectNameStrs[i];
        if (!zn) continue;
        let hit = wishymatch(name, zn, true);
        if (!hit && check_of) {
            const of = zn.toLowerCase().indexOf(' of ');
            if (of >= 0 && i !== BELL_OF_OPENING
                && (minglob < 0 || i < minglob || i > maxglob)) {
                hit = wishymatch(name, zn.slice(of + 4), false);
            }
        }
        const zd = objectDescrs[i];
        if (!hit && zd) {
            hit = wishymatch(name, zd, false);
            if (!hit && check_of) {
                const of = zd.toLowerCase().indexOf(' of ');
                if (of >= 0) hit = wishymatch(name, zd.slice(of + 4), false);
            }
        }
        if (hit) {
            valid.push(i);
            maxprob += (objs[i]?.oc_prob || 0) + (xtra_prob | 0);
        }
    }
    if (valid.length > 0 && maxprob) {
        let prob = rn2(maxprob);
        for (let i = 0; i < valid.length - 1; i++) {
            prob -= (objs[valid[i]]?.oc_prob || 0) + (xtra_prob | 0);
            if (prob < 0) return valid[i];
        }
        return valid[valid.length - 1];
    }
    return STRANGE_OBJECT;
}

/**
 * C ref: objnam.c readobjnam_parse_charges — strip trailing "(N)" / "(R:S)".
 */
function readobjnam_parse_charges(d) {
    if (!d.bp || d.bp.length <= 1) return;
    const paren = d.bp.lastIndexOf('(');
    if (paren < 0) return;
    let keeptrailing = true;
    let cut = paren;
    if (paren > 0 && d.bp[paren - 1] === ' ') cut = paren - 1;
    let p = d.bp.slice(paren + 1); // past '('
    const head = d.bp.slice(0, cut);
    if (/^lit\)/i.test(p)) {
        d.islit = 1;
        p = p.slice(4); // after "lit)"
    } else {
        let i = 0;
        while (i < p.length && p[i] >= '0' && p[i] <= '9') i++;
        d.spe = parseInt(p.slice(0, i) || '0', 10) || 0;
        p = p.slice(i);
        if (p[0] === ':') {
            p = p.slice(1);
            d.rechrg = d.spe;
            i = 0;
            while (i < p.length && p[i] >= '0' && p[i] <= '9') i++;
            d.spe = parseInt(p.slice(0, i) || '0', 10) || 0;
            p = p.slice(i);
        }
        if (p[0] !== ')') {
            d.spe = 0;
            d.rechrg = 0;
            keeptrailing = false;
            p = '';
        } else {
            d.spesgn = 1;
            p = p.slice(1); // past ')'
        }
    }
    d.bp = keeptrailing ? head + p : head;
    if (d.spe < 0) {
        d.spesgn = -1;
        d.spe = Math.abs(d.spe);
    }
    if (d.spe > SPE_LIM) d.spe = SPE_LIM;
    if (d.rechrg < 0 || d.rechrg > 7) d.rechrg = 7;
}

/**
 * C ref: objnam.c postparse1 wrp[] loop — "wand of X" / "X wand" → oclass.
 * Returns true when actualn/oclass are set for srch (rnd_otyp_by_namedesc).
 */
function readobjnam_parse_class_words(d) {
    const bp = d.bp;
    if (!bp) return false;
    // C false-hit guards before wrp scan
    if (/^enchant /i.test(bp) || /^destroy /i.test(bp)
        || /^detect food/i.test(bp) || /^food detection/i.test(bp)
        || /^ring mail/i.test(bp) || /^studded leather armor/i.test(bp)
        || /^leather armor/i.test(bp) || /^tooled horn/i.test(bp)
        || /^food ration/i.test(bp) || /^meat ring/i.test(bp)) {
        return false;
    }
    const lower = bp.toLowerCase();
    for (let i = 0; i < WRP.length; i++) {
        const word = WRP[i];
        const j = word.length;
        if (lower.startsWith(word)
            && (bp.length === j || bp[j] === ' ')) {
            d.oclass = WRPSYMS[i];
            if (d.oclass !== AMULET_CLASS) {
                let rest = bp.slice(j);
                if (/^ of /i.test(rest)) d.actualn = rest.slice(4);
                // else leave actualn unset (C: /* else if(*bp) ?? */)
            } else {
                d.actualn = bp;
            }
            return true;
        }
        // trailing " <class>"
        if (lower.endsWith(word)
            && (bp.length === j || bp[bp.length - j - 1] === ' ')) {
            d.oclass = WRPSYMS[i];
            if (d.oclass !== AMULET_CLASS) {
                let cut = bp.length - j;
                if (cut > 0 && bp[cut - 1] === ' ') cut -= 1;
                d.bp = bp.slice(0, cut);
                d.actualn = d.dn = d.bp;
            } else {
                d.actualn = d.dn = bp;
            }
            return true;
        }
    }
    return false;
}

/**
 * C ref: objnam.c readobjnam `any:` — wrpsym[rn2(sizeof)] then mkobj(oclass, FALSE).
 * Used when bp is NULL (makewish after MAXWISHTRY) or empty after preparse
 * (ESC/empty wish → makewish clears ESC to "" → preparse returns 1).
 */
function readobjnam_any(d) {
    if (!d.oclass) {
        d.oclass = WRPSYMS[rn2(WRPSYMS.length)];
    }
    if (d.typ) {
        d.oclass = game.objects?.[d.typ]?.oc_class ?? d.oclass;
        d.otmp = mksobj(d.typ, true, false);
    } else {
        d.otmp = mkobj(d.oclass, false);
    }
    if (!d.otmp) return null;
    d.typ = d.otmp.otyp;
    d.oclass = d.otmp.oclass;
    d.otmp.owt = weight(d.otmp);
    return d.otmp;
}

/**
 * C ref: objnam.c readobjnam — wish subset for artifact / named armor / amulet.
 * Empty/NULL → `any` (D-0559); qualifier-only empty (blessed/rustproof/…) deferred.
 */
export function readobjnam(bp, no_wish) {
    // C: readobjnam_init + if (!bp) goto any
    if (bp == null) {
        return readobjnam_any({
            typ: 0, oclass: 0, otmp: null,
        });
    }
    bp = mungspaces(bp);
    // C: "nothing"/"nil"/"none" → return no_wish (wishless conduct)
    if (/^(nothing|nil|none)$/i.test(bp)) return no_wish || NOTHING_OBJ;
    // C: empty bp (or ESC already cleared by makewish) → preparse returns 1 → any
    if (!bp || bp === '\x1b') {
        return readobjnam_any({
            typ: 0, oclass: 0, otmp: null,
        });
    }

    const d = {
        bp,
        origbp: bp,
        cnt: 0,
        spe: 0,
        spesgn: 0,
        rechrg: 0,
        typ: 0,
        blessed: 0,
        uncursed: 0,
        iscursed: 0,
        oclass: 0,
        actualn: null,
        dn: null,
        un: null,
        name: null,
        mntmp: NON_PM,
        otmp: null,
        islit: 0,
    };

    for (;;) {
        if (!d.bp) break;
        let l = 0;
        const s = d.bp;
        if (/^an /i.test(s)) { d.cnt = 1; l = 3; }
        else if (/^a /i.test(s)) { d.cnt = 1; l = 2; }
        else if (/^the /i.test(s)) { l = 4; }
        else if (!d.cnt && /^\d/.test(s) && s !== '0') {
            const m = s.match(/^(\d+)/);
            d.cnt = parseInt(m[1], 10);
            d.bp = s.slice(m[1].length).replace(/^ +/, '');
            continue;
        } else if (s[0] === '+' || s[0] === '-') {
            d.spesgn = s[0] === '+' ? 1 : -1;
            d.bp = s.slice(1);
            const m = d.bp.match(/^(\d+)/);
            d.spe = m ? parseInt(m[1], 10) : 0;
            d.bp = d.bp.slice(m ? m[1].length : 0).replace(/^ +/, '');
            continue;
        } else if (/^blessed /i.test(s) || /^holy /i.test(s)) {
            d.blessed = 1; d.uncursed = 0; d.iscursed = 0;
            l = /^blessed /i.test(s) ? 8 : 5;
        } else if (/^cursed /i.test(s) || /^unholy /i.test(s)) {
            d.iscursed = 1; d.blessed = 0; d.uncursed = 0;
            l = 7;
        } else if (/^uncursed /i.test(s)) {
            d.uncursed = 1; d.blessed = 0; d.iscursed = 0;
            l = 9;
        } else {
            break;
        }
        if (l) d.bp = s.slice(l);
    }
    if (!d.cnt) d.cnt = 1;

    // C: readobjnam_parse_charges before postparse
    readobjnam_parse_charges(d);

    {
        const rem = { rest: null };
        if (d.mntmp < LOW_PM && d.bp.length > 2) {
            const mndx = name_to_monplus(d.bp, rem);
            if (mndx >= LOW_PM) {
                d.mntmp = mndx;
                let rest = rem.rest || '';
                if (rest.startsWith(' ')) rest = rest.slice(1);
                else if (/^s /i.test(rest)) rest = rest.slice(2);
                else if (/^es /i.test(rest) || /^'s /i.test(rest)) rest = rest.slice(3);
                else if (!rest && !d.actualn && !d.dn && !d.un && !d.oclass) {
                    d.mntmp = NON_PM;
                    rest = d.bp;
                }
                if (d.mntmp >= LOW_PM) d.bp = rest;
            }
        }
    }

    if (/^scales$/i.test(d.bp) && d.mntmp >= GRAY_DRAGON && d.mntmp <= YELLOW_DRAGON) {
        d.typ = GRAY_DS + (d.mntmp - GRAY_DRAGON);
        d.mntmp = NON_PM;
    }

    // C ref: objnam.c readobjnam — makesingular before alt spellings / wrp / srch.
    // Exceptions: "tricks" (bag of tricks), "clothes" (avoid cloth false hit).
    if (d.bp && !/^tricks$/i.test(d.bp) && !/^clothes$/i.test(d.bp)) {
        const sng = makesingular(d.bp);
        if (sng !== d.bp) {
            if (d.cnt === 1) d.cnt = 2;
            d.bp = sng;
        }
    }

    // C ref: objnam.c readobjnam_postparse1 — gold/money → mksobj(GOLD_PIECE, FALSE)
    // and return otmp (skips namedesc / typfnd). Case 3 in C.
    {
        const bp = d.bp || '';
        const end = bp.length;
        const isGold = (end >= 10 && bp.slice(end - 10).toLowerCase() === 'gold piece')
            || (end >= 7 && bp.slice(end - 7).toLowerCase() === 'zorkmid')
            || /^gold$/i.test(bp) || /^money$/i.test(bp) || /^coin$/i.test(bp)
            || bp === GOLD_SYM;
        if (isGold && GOLD_PIECE >= 0) {
            let cnt = d.cnt | 0;
            if (cnt > 5000 && !wizardMode()) cnt = 5000;
            else if (cnt < 1) cnt = 1;
            d.otmp = mksobj(GOLD_PIECE, false, false);
            if (!d.otmp) return null;
            d.otmp.quan = cnt;
            d.otmp.owt = weight(d.otmp);
            return d.otmp;
        }
    }

    // C: postparse1 wrp[] — "wand of polymorph" → WAND_CLASS + "polymorph"
    if (!d.typ && !d.oclass) {
        readobjnam_parse_class_words(d);
    }

    if (!d.typ) {
        if (!d.actualn) d.actualn = d.bp;
        if (!d.dn) d.dn = d.actualn;

        // C: postparse3 — search even when oclass is set (srch path)
        if (d.actualn) {
            let typ = rnd_otyp_by_namedesc(d.actualn, d.oclass, 1);
            if (typ === STRANGE_OBJECT && d.dn !== d.actualn) {
                typ = rnd_otyp_by_namedesc(d.dn, d.oclass, 1);
            }
            if (typ === STRANGE_OBJECT && d.un) {
                typ = rnd_otyp_by_namedesc(d.un, d.oclass, 1);
            }
            if (typ === STRANGE_OBJECT && d.origbp !== d.actualn) {
                typ = rnd_otyp_by_namedesc(d.origbp, d.oclass, 1);
            }
            if (typ !== STRANGE_OBJECT) d.typ = typ;
        }

        if (!d.typ && !d.oclass && d.actualn) {
            const out = { otyp: 0 };
            const aname = artifact_name(d.actualn, out, true);
            if (aname) {
                d.name = aname;
                d.typ = out.otyp;
            }
        }
    }

    if (!d.typ && !d.oclass) return null;

    if (d.typ) d.oclass = game.objects?.[d.typ]?.oc_class ?? 0;
    d.otmp = mksobj(d.typ, true, false);
    d.typ = d.otmp.otyp;
    d.oclass = d.otmp.oclass;

    // C ref: objnam.c typfnd — honor d.cnt when oc_merge (wizard unrestricted;
    // non-wizard rnd(6)/candle/ammo arms deferred).
    if ((d.cnt | 0) > 0 && oc_merge_of(d.otmp.otyp) && wizardMode()) {
        d.otmp.quan = d.cnt | 0;
        d.otmp.owt = weight(d.otmp);
    }

    if (d.spesgn === 0) {
        d.spe = d.otmp.spe | 0;
    } else if (!wizardMode()
        && (d.oclass === ARMOR_CLASS || d.oclass === WEAPON_CLASS)) {
        // non-wizard clamp omitted for wizard-seed path
    }
    if (d.spesgn === -1) d.spe = -d.spe;
    if (d.spe > SPE_LIM) d.spe = SPE_LIM;
    if (d.spe < -SPE_LIM) d.spe = -SPE_LIM;
    d.otmp.spe = d.spe;

    // C: set otmp->recharged for WAND_CLASS
    if (d.oclass === WAND_CLASS) {
        let rechrg = d.rechrg | 0;
        if (d.otmp.otyp === WAN_WISHING && !wizardMode()) rechrg = 1;
        d.otmp.recharged = rechrg;
    }

    if (d.mntmp >= GRAY_DRAGON && d.mntmp <= YELLOW_DRAGON
        && d.otmp.otyp === SCALE_MAIL) {
        d.otmp.otyp = GRAY_DSM + (d.mntmp - GRAY_DRAGON);
        d.typ = d.otmp.otyp;
        d.otmp.oclass = ARMOR_CLASS;
    }

    if (d.iscursed) {
        curse(d.otmp);
    } else if (d.uncursed) {
        d.otmp.blessed = false;
        d.otmp.cursed = (Luck() < 0 && !wizardMode());
    } else if (d.blessed) {
        d.otmp.blessed = (Luck() >= 0 || wizardMode());
        d.otmp.cursed = (Luck() < 0 && !wizardMode());
    } else if (d.spesgn < 0) {
        curse(d.otmp);
    }

    d.otmp.oeroded = 0;
    d.otmp.oeroded2 = 0;

    if (d.name) {
        const out = { otyp: 0 };
        const aname = artifact_name(d.name, out, true);
        if (aname && out.otyp === d.otmp.otyp) d.name = aname;
        const wishedName = d.name;
        d.otmp = oname(d.otmp, d.name, ONAME_WISH);
        if (d.otmp.oartifact || wishedName === aname) {
            d.otmp.quan = 1;
            if (!game.u) game.u = {};
            if (!game.u.uconduct) game.u.uconduct = {};
            game.u.uconduct.wisharti = (game.u.uconduct.wisharti | 0) + 1;
        }
    }

    // C: evaluate rn2(nartifact_exist()) even when wizard (|| short-circuit)
    if (d.otmp.oartifact) {
        const denyRoll = rn2(nartifact_exist()) > 1;
        if (denyRoll && !wizardMode()) return HANDS_OBJ;
    }

    d.otmp.owt = weight(d.otmp);
    return d.otmp;
}
