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
} from './objects.js';
import { mksobj, weight, curse } from './mkobj.js';
import { artifact_name, nartifact_exist } from './artifact.js';
import { oname } from './do_name.js';
import { name_to_monplus } from './mondata.js';
import { NON_PM, LOW_PM, monsterNames } from './monsters.js';
import { ONAME_WISH, SPE_LIM } from './const.js';

const STRANGE_OBJECT = 0;
const GRAY_DRAGON = monsterNames.indexOf('PM_GRAY_DRAGON');
const YELLOW_DRAGON = monsterNames.indexOf('PM_YELLOW_DRAGON');
const GRAY_DSM = objectNames.indexOf('GRAY_DRAGON_SCALE_MAIL');
const GRAY_DS = objectNames.indexOf('GRAY_DRAGON_SCALES');
const SCALE_MAIL = objectNames.indexOf('SCALE_MAIL');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');

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
 * C ref: objnam.c readobjnam — wish subset for artifact / named armor / amulet.
 */
export function readobjnam(bp, no_wish) {
    if (bp == null) return null;
    bp = mungspaces(bp);
    if (!bp || bp === '\x1b') return no_wish || null;
    if (/^(nothing|nil|none)$/i.test(bp)) return no_wish || NOTHING_OBJ;

    const d = {
        bp,
        origbp: bp,
        cnt: 0,
        spe: 0,
        spesgn: 0,
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

    if (!d.typ) {
        d.actualn = d.bp;
        if (!d.dn) d.dn = d.actualn;

        if (!d.oclass && d.actualn) {
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
