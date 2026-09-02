// engrave.js — engravings.
// C ref: src/engrave.c
//
// Only the level-generation entry points are ported so far: random_engraving()
// and wipeout_text(), which mklev.c calls when it decorates a room. Both are
// heavy PRNG consumers and were previously a single invented rn2(48).

import { ceiling } from './dungeon.js';
import { game } from './gstate.js';
import { is_ice } from './dbridge.js';
import { rn1, rn2, rnd } from './rng.js';
import { can_reach_floor } from './pickup.js';
import { getrumor, get_rnd_text, MD_PAD_RUMORS } from './rumors.js';
import { COLNO, ROWNO, DUST, ENGRAVE, BURN, MARK, HEADSTONE, ENGR_BLOOD,
         N_ENGRAVE, ECMD_OK, ECMD_TIME, ECMD_CANCEL } from './const.js';
import { getobj, GETOBJ_PROMPT, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, hands_obj } from './invent.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { is_pool, is_lava } from './mon.js';
import { You, pline_The } from './pline.js';
import { pline, newsym } from './display.js';
import { getlin } from './cmd.js';
import { set_occupation } from './allmain.js';
import { exercise } from './attrib.js';
import { A_WIS } from './const.js';
import { xname, doname } from './objnam.js';
import { more_experienced } from './exper.js';
import { surface } from './dungeon.js';

// src/engrave.c:65 rubouts[] — how each character degrades. Order matters:
// wipeout_text() scans linearly and the index it stops at decides whether the
// character becomes a substitute or a '?'.
const rubouts = [
    ['A', '^'], ['B', 'Pb['], ['C', '('], ['D', '|)['], ['E', '|FL[_'],
    ['F', '|-'], ['G', 'C('], ['H', '|-'], ['I', '|'], ['K', '|<'],
    ['L', '|_'], ['M', '|'], ['N', '|\\'], ['O', 'C('], ['P', 'F'],
    ['Q', 'C('], ['R', 'PF'], ['T', '|'], ['U', 'J'], ['V', '/\\'],
    ['W', 'V/\\'], ['Z', '/'], ['b', '|'], ['d', 'c|'], ['e', 'c'],
    ['g', 'c'], ['h', 'n'], ['j', 'i'], ['k', '|'], ['l', '|'],
    ['m', 'nr'], ['n', 'r'], ['o', 'c'], ['q', 'c'], ['w', 'v'],
    ['y', 'v'], [':', '.'], [';', ',:'], [',', '.'], ['=', '-'],
    ['+', '-|'], ['*', '+'], ['@', '0'], ['0', 'C('], ['1', '|'],
    ['6', 'o'], ['7', '/'], ['8', '3o'],
];

// src/engrave.c:119 wipeout_text() — degrade `cnt` characters of `engr`.
//
// With seed == 0 (the level-generation case) each iteration draws rn2(lth) and
// rn2(4), and a character that has a rubout entry draws a third rn2(ln). A
// space or a small punctuation mark `continue`s *after* those first two draws,
// so the draw count is not simply 2 or 3 per character.
export function wipeout_text(engr, cnt, seed) {
    let s = engr.split('');
    let lth = s.length;

    if (lth && cnt > 0) {
        while (cnt--) {
            let nxt, use_rubout;
            if (!seed) {
                nxt = rn2(lth);
                use_rubout = rn2(4);
            } else {
                nxt = seed % lth;
                seed = (seed * 31) % (BUFSZ - 1);
                use_rubout = seed & 3;
            }
            if (s[nxt] === ' ')
                continue;

            /* rub out unreadable & small punctuation marks */
            if ('?.,\'`-|_'.includes(s[nxt])) {
                s[nxt] = ' ';
                continue;
            }

            let i;
            if (!use_rubout) {
                i = rubouts.length;
            } else {
                for (i = 0; i < rubouts.length; i++)
                    if (s[nxt] === rubouts[i][0]) {
                        const wipeto = rubouts[i][1];
                        let j;
                        if (!seed) {
                            j = rn2(wipeto.length);
                        } else {
                            seed = (seed * 31) % (BUFSZ - 1);
                            j = seed % wipeto.length;
                        }
                        s[nxt] = wipeto[j];
                        break;
                    }
            }

            /* didn't pick rubout; use '?' for unreadable character */
            if (i === rubouts.length)
                s[nxt] = '?';
        }
    }

    /* trim trailing spaces */
    let out = s.join('');
    while (out.length && out[out.length - 1] === ' ')
        out = out.slice(0, -1);
    return out;
}

const BUFSZ = 256;   /* include/global.h */

// src/engrave.c:50 random_engraving()
//
// The text comes from dat/rumors, or from dat/engrave when the rn2(4) says so
// or the rumor lookup comes back empty. Then a quarter of the characters are
// rubbed out. Returns { text, pristine } — C's two output buffers.
export function random_engraving() {
    let pristine = '';
    let rumor = null;

    if (!rn2(4)) {
        pristine = get_rnd_text('engrave', rn2, MD_PAD_RUMORS);
    } else {
        rumor = getrumor(0, true);
        pristine = rumor;
        if (!rumor || rumor.length === 0)
            pristine = get_rnd_text('engrave', rn2, MD_PAD_RUMORS);
    }

    const text = wipeout_text(pristine, Math.trunc(pristine.length / 4), 0);
    return { text, pristine };
}

// ---------------------------------------------------------------------------
// The level's engraving list. src/engrave.c keeps it as svl.level.lev_engr, a
// linked list; a plain array is the same thing for our purposes because the
// only ordering that matters is "the one at these coordinates".
// ---------------------------------------------------------------------------

// src/engrave.c engr_at()
export function engr_at(x, y) {
    return (game.level?.lev_engr || []).find(e => e.x === x && e.y === y) || null;
}

// src/engrave.c:314 read_engr_at() — sense and read the engraving under a
// spot; the ':' look and every walk-onto-the-square path go through it.
// ENGRAVE/HEADSTONE/BURN/MARK/BLOOD arms are written out but only DUST is
// generated by anything ported (makeniche and the 'E' command).
export async function read_engr_at(x, y) {
    const ep = engr_at(x, y);
    /* surface(x,y) is "floor" on every reachable square */
    const eloc = 'floor';
    let sensed = 0;

    if (ep && ep.engr_txt && ep.engr_txt[0]) {
        switch (ep.engr_type) {
        case DUST:
            if (!game.u.ublind) {
                sensed = 1;
                await pline(`Something is written here in the ${
                    /* is_ice() */ false ? 'frost' : 'dust'}.`);
            }
            break;
        case BURN:
            if (!game.u.ublind) {
                sensed = 1;
                await pline('Some text has been '
                    + `${false ? 'melted' : 'burned'} into the ${eloc} here.`);
            }
            break;
        case ENGRAVE:
        case HEADSTONE:
            if (!game.u.ublind) {
                sensed = 1;
                await pline(`Something is engraved here on the ${eloc}.`);
            }
            break;
        case MARK:
            if (!game.u.ublind) {
                sensed = 1;
                await pline(`There's some graffiti on the ${eloc} here.`);
            }
            break;
        case ENGR_BLOOD:
            if (!game.u.ublind) {
                sensed = 1;
                await You('see a message scrawled in blood here.');
            }
            break;
        default:
            /* impossible("%s is written in a very strange way.") */
            sensed = 1;
            break;
        }

        if (sensed) {
            const et = ep.engr_txt;
            /* skip the added '.' only when the original text ends in
               punctuation that survived degradation */
            const last = et[et.length - 1];
            const plast = (ep.engr_txt_pristine || '')[et.length - 1];
            const endpunct = (et.length < 2
                              || !(plast === last && '.!?'.includes(last)))
                ? '.' : '';
            await You(`${game.u.ublind ? 'feel the words' : 'read'}: `
                + `"${et}"${endpunct}`);
            ep.engr_txt_remembered = ep.engr_txt;
            ep.eread = 1;
            ep.erevealed = 1;
            if (game.context.run > 0) {
                const { nomul } = await import('./hack.js');
                nomul(0);
            }
        }
    }
}

// src/engrave.c del_engr()
export function del_engr(ep) {
    const list = game.level?.lev_engr;
    if (!list) return;
    const i = list.indexOf(ep);
    if (i >= 0) list.splice(i, 1);
}

// src/engrave.c del_engr_at()
export function del_engr_at(x, y) {
    const ep = engr_at(x, y);
    if (ep)
        del_engr(ep);
}

// src/engrave.c:1667 rloc_engr() - randomly relocate an engraving to a
// terrain square accepted by goodpos(). The destination draws are observable
// even when the relocated text is outside the current viewport.
export async function rloc_engr(ep) {
    const { goodpos } = await import('./makemon.js');
    let tryct = 200;

    do {
        if (--tryct < 0)
            return;
        const tx = rn1(COLNO - 3, 2);
        const ty = rn2(ROWNO);
        if (!engr_at(tx, ty) && goodpos(tx, ty, null, 0)) {
            ep.x = tx;
            ep.y = ty;
            newsym(tx, ty);
            return;
        }
    } while (true);
}

// src/engrave.c:408 make_engr_at() — replaces any engraving already there.
//
// It DOES draw, on one branch: engr_type <= 0 means "pick one", and that costs
// rnd(N_ENGRAVE - 1). Every caller in the tree passes a real type, so the draw
// is unreachable today, but the branch is the whole reason the parameter is an
// int rather than an enum and it is one line to keep honest.
//
// The signature carries pristine_s, C's fourth parameter: an engraving keeps
// three copies of its text (what is there, what the hero remembers reading, and
// what it said before erosion), and pristine_s seeds the third with something
// other than s. Only mklev.c:1153's MARK engraving passes it.
export function make_engr_at(x, y, s, pristine_s, e_time, e_type) {
    const old = engr_at(x, y);
    if (old) del_engr(old);

    const txt = String(s);
    /* src/engrave.c:442 — engraving "Elbereth": at mklev it guards objects,
       from the player it exercises wisdom */
    if (txt === 'Elbereth' && !game.in_mklev)
        exercise(A_WIS, true);
    const ep = {
        x, y,
        engr_txt: txt,                          /* actual_text */
        engr_txt_remembered: txt,               /* remembered_text */
        engr_txt_pristine: pristine_s != null ? String(pristine_s) : txt,
        engr_time: e_time,
        engr_type: (e_type > 0) ? e_type : rnd(N_ENGRAVE - 1),
        guardobjects: 0,
        nowipeout: false,
    };

    /* engraving "Elbereth" while the level is being made creates the old-style
       one that deters monsters whenever objects are present; the hero doing it
       exercises wisdom instead. */
    if (txt === 'Elbereth') {
        if (game.in_mklev)
            ep.guardobjects = 1;
    }

    (game.level.lev_engr ||= []).push(ep);
}

// src/engrave.c:250 u_wipe_engr() — rub out part of what is under the hero.
export function u_wipe_engr(cnt) {
    if (can_reach_floor(true))
        wipe_engr_at(game.u.ux, game.u.uy, cnt, false);
}

// src/engrave.c wipe_engr_at() — age an engraving by rubbing out `cnt` of its
// characters.
//
// A DUST or ENGR_BLOOD engraving erodes by the full count; anything else first
// rolls `cnt = rn2(1 + 50 / (cnt + 1)) ? 0 : 1`, so it usually erodes nothing
// and that roll is itself a draw. makeniche() only ever writes DUST, so the
// level generator takes the first path.
export function wipe_engr_at(x, y, cnt, magical) {
    const ep = engr_at(x, y);
    if (!ep || ep.engr_type === HEADSTONE || ep.nowipeout) return;
    /* engrave.c:278 — burned text resists wiping unless it sits on ice
       or the magical half-chance fires */
    if (ep.engr_type === BURN && !is_ice(x, y)
        && !(magical && !rn2(2))) return;

    if (ep.engr_type !== DUST && ep.engr_type !== ENGR_BLOOD)
        cnt = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;

    ep.engr_txt = wipeout_text(ep.engr_txt, cnt, 0);
    ep.engr_txt = ep.engr_txt.replace(/^ +/, '');
    if (!ep.engr_txt) del_engr(ep);
}

// src/engrave.c sengr_at() — is `s` engraved at (x,y)?
//
// Three call sites are waiting on this: onscary's Elbereth arm,
// setmangry's hypocrite branch (whose rnd(5) is its ONLY draw), and
// goodpos_onscary.
//
// The engr_time test is not decoration: an engraving made THIS turn does not
// count until moves catches up, so a monster is not scared by Elbereth on the
// turn it is written. HEADSTONE is excluded because a grave's text is not an
// engraving for this purpose.
//
// `strict` picks exact match versus substring, both case-insensitive --
// strcmpi and strstri. Elbereth callers pass TRUE.
export function sengr_at(s, x, y, strict) {
    const ep = engr_at(x, y);

    if (ep && ep.engr_type !== HEADSTONE && ep.engr_time <= game.moves) {
        const txt = String(ep.engr_txt ?? '');
        if (strict ? txt.toLowerCase() === String(s).toLowerCase()
                   : txt.toLowerCase().includes(String(s).toLowerCase()))
            return ep;
    }
    return null;
}

function note_unported_engrave(what) {
    (game.unported ||= new Set()).add(what);
}

// src/engrave.c:481 stylus_ok() — getobj filter for 'E'.
export function stylus_ok(obj) {
    if (!obj)
        return GETOBJ_SUGGEST;
    if (obj.oclass === OCLASSES.WEAPON_CLASS || obj.oclass === OCLASSES.WAND_CLASS
        || obj.oclass === OCLASSES.GEM_CLASS || obj.oclass === OCLASSES.RING_CLASS)
        return GETOBJ_SUGGEST;
    if (obj.oclass === OCLASSES.TOOL_CLASS
        && (obj.otyp === ONAMES.TOWEL || obj.otyp === ONAMES.MAGIC_MARKER))
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

// src/engrave.c:502 u_can_engrave() — the terrain gates. Lava, pools,
// fountains, air and engulfment cannot occur under the hero yet; each
// records if its state appears.
function u_can_engrave() {
    if (game.u.uswallow || is_lava(game.u.ux, game.u.uy)
        || is_pool(game.u.ux, game.u.uy)) {
        note_unported_engrave('u_can_engrave:blocked_terrain');
        return false;
    }
    return true;
}

// src/engrave.c:956 doengrave() — the 'E' command, dust-writing spine.
//
// Fire and digging wands cover the BURN and ENGRAVE writing paths. Other
// item effects, existing-engraving interaction, altars and graves record when
// their state occurs. The fingertip-in-dust path implements the prompt, DUST
// mix-up rolls, and engraving occupation.
export async function doengrave() {
    if (!u_can_engrave())
        return ECMD_OK;                 /* ECMD_FAIL */

    game.multi = 0;

    const otmp = await getobj('write with', stylus_ok, GETOBJ_PROMPT);
    if (!otmp)
        return ECMD_CANCEL;

    let type = DUST;
    let stylus = null;
    let post_engr_text = '';
    if (otmp !== hands_obj) {
        if (otmp.otyp !== ONAMES.WAN_FIRE
            && otmp.otyp !== ONAMES.WAN_DIGGING) {
            note_unported_engrave('doengrave:stylus_item');
            return ECMD_TIME;
        }

        const { zappable, learnwand } = await import('./zap.js');
        if (!(await zappable(otmp))) {
            await pline_The('wand is too worn out to engrave.');
            return ECMD_TIME;
        }
        type = otmp.otyp === ONAMES.WAN_FIRE ? BURN : ENGRAVE;
        stylus = otmp;
        if (otmp.otyp === ONAMES.WAN_FIRE) {
            post_engr_text = game.u.ublind ? 'You feel the wand heat up.'
                                           : 'Flames fly from the wand.';
        } else {
            post_engr_text = game.u.ublind ? 'You feel tremors.'
                                           : 'Gravel flies up from the floor.';
        }
        if (!game.objects[otmp.otyp].oc_name_known) {
            if (game.flags?.verbose !== false)
                await pline(`This ${xname(otmp)} is a wand of ${
                    otmp.otyp === ONAMES.WAN_FIRE ? 'fire' : 'digging'}!`);
            learnwand(otmp);
            if (game.objects[otmp.otyp].oc_name_known)
                more_experienced(0, 10);
        }
    }

    const oep = engr_at(game.u.ux, game.u.uy);
    if (oep) {
        note_unported_engrave('doengrave:existing_engraving');
        return ECMD_TIME;
    }

    const eloc = surface(game.u.ux, game.u.uy);
    if (otmp === hands_obj)
        await You(`write in the ${is_ice(game.u.ux, game.u.uy)
            ? 'frost' : 'dust'} with your fingertip.`);
    else if (type === BURN)
        await You(`burn into the ${eloc} with ${doname(otmp)}.`);
    else
        await You(`engrave in the ${eloc} with ${doname(otmp)}.`);

    const prompt = type === BURN
        ? `What do you want to burn into the ${eloc} here?`
        : type === ENGRAVE
            ? `What do you want to engrave in the ${eloc} here?`
            : `What do you want to write in the ${is_ice(game.u.ux, game.u.uy)
                ? 'frost' : 'dust'} here?`;
    const ebuf0 = await getlin(prompt);
    if (ebuf0 === null)
        { await pline('Never mind.'); return ECMD_OK; }
    /* mungspaces: tabs to spaces, consecutive spaces condensed */
    const ebuf = ebuf0.replace(/\t/g, ' ').replace(/ {2,}/g, ' ')
                      .replace(/^ | $/g, '');

    let len = 0;
    for (const c of ebuf)
        if (c !== ' ')
            len++;
    if (len === 0 || ebuf.includes('\x1b')) {
        await pline('Never mind.');
        return ECMD_OK;
    }

    /* single 'x' is the illiterate signature */
    if (len !== 1 || !/[xX]/.test(ebuf)) {
        game.u.uconduct = game.u.uconduct || {};
        game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
    }

    /* src/engrave.c:1220 — mix up the writing on an unsound surface */
    let mixed = '';
    for (const c of ebuf) {
        if (c !== ' ' && ((type === DUST || type === ENGR_BLOOD) && !rn2(25)))
            mixed += String.fromCharCode(32 + rnd(96 - 2));
        else
            mixed += c;
    }

    game.context.engraving = {
        text: mixed,
        nextc: 0,
        stylus,
        type,
        pos: { x: game.u.ux, y: game.u.uy },
        actionct: 0,
    };
    set_occupation(engrave, 'engraving', 0);
    if (post_engr_text)
        await pline(post_engr_text);

    /* the setup itself takes no time; the occupation acts */
    return ECMD_OK;
}

// src/engrave.c:1266 engrave() — the per-action occupation: ten characters
// per action, then "You finish your writing in the dust." The carving,
// marker-ink and weapon-dulling arms record with their styli.
export function engrave() {
    const eng = game.context.engraving;
    if (!eng)
        return 0;
    if (eng.pos.x !== game.u.ux || eng.pos.y !== game.u.uy) {
        note_unported_engrave('engrave:moved_away');
        return 0;
    }

    const rate = 10;
    eng.actionct++;

    /* consume up to `rate` non-space characters */
    let endc = eng.nextc, i = rate;
    while (endc < eng.text.length && i > 0) {
        if (eng.text[endc] !== ' ')
            i--;
        endc++;
    }

    let buf = '';
    const oep = engr_at(game.u.ux, game.u.uy);
    if (oep)
        buf = oep.engr_txt;
    buf += eng.text.slice(eng.nextc, endc);

    make_engr_at(game.u.ux, game.u.uy, buf, null,
                 game.moves - (game.multi || 0), eng.type);
    const nep = engr_at(game.u.ux, game.u.uy);
    if (nep) {
        nep.eread = 1;
        nep.erevealed = 1;
    }

    if (endc < eng.text.length) {
        eng.nextc = endc;
        if (eng.actionct === 1)
            newsym(eng.pos.x, eng.pos.y);
        return 1;                       /* not yet finished */
    }
    /* finished */
    newsym(eng.pos.x, eng.pos.y);
    game.context.engraving = null;
    return 0;
}

// src/engrave.c:218 cant_reach_floor()
export async function cant_reach_floor(x, y, up, check_pit, wand_engraving) {
    await pline(`${
        wand_engraving
            ? 'The wand does nothing more, and the tip of the wand'
            : 'You'} can't reach the ${
        up  ? ceiling(x, y)
            : (check_pit && can_reach_floor(false)) ? 'bottom of the pit'
                                                    : surface(x, y)}.`);
}
