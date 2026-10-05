// vault.js — port of nethack-c/src/vault.c (vault and guard logic).
//
// Cardinal Rule 1: the C source is the truth. This module is a faithful,
// structure-preserving port; functions mirror their C originals line-for-line
// where practical.

import { pline, newsym, canspotmon, map_invisible, map_location, You_hear, You_see, mon_visible } from './display.js'; /* was an undeclared global: every pline() call in this file threw ReferenceError when reached */
import { game } from './gstate.js';
import {
    ROOMOFFSET, VAULT, EGD,
    RLOC_NOMSG, MALE, FEMALE, NEUTRAL, NUM_MGENDERS,
    VAULT_GUARD_TIME, ROOM, CORR, STONE, HWALL, DOOR, VWALL,
    COLNO, ROWNO, u_at, isok, SCORR, IN_SIGHT, COULD_SEE,
    IS_STWALL, IS_POOL, IS_ROOM, ACCESSIBLE, IS_OBSTRUCTED,
    MM_EGD, MM_NOMSG, M_AP_OBJECT, M_AP_NOTHING, A_LAWFUL, NEED_HTH_WEAPON, IS_WALL,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER, MELT_ICE_AWAY, D_NODOOR,
    RLOC_ERR, RLOC_MSG, OBJ_MINVENT,
    ARTICLE_A,
} from './const.js';
import { rn2, rn1 } from './rng.js';
import { PM_GUARD, PM_CROESUS } from './pm.generated.js';
import { newmextra, set_malign, mhe, monPmname } from './makemon.js';
import { makemon, mungspaces, xy_set_wall_state, mongone, make_grave, place_object, remove_object, setmangry } from './mklev.js';
import { relobj } from './steal.js';
import { stackobj } from './sp_lev.js';
import { on_level } from './dungeon.js';
import { contained_gold, currency } from './shk.js';
import { makeplural, simpleonames } from './objnam.js';
import { upstart } from './mklev.js';
import { in_rooms } from './shk.js';
import { g_at, um_dist } from './cmd.js';
import { freeinv as freeinv_real } from './cmd.js';
import { add_to_minv, obfree } from './dokick.js';
import { mnexto as mnexto_real, rloc, enexto_out } from './teleport.js';
import { m_at, mon_wield_item } from './uhitm.js';
import { place_monster } from './steed.js';
import { del_engr_at } from './mklev.js';
import { t_at, deltrap } from './trap.js';
import { sticks as sticks_real, m_into_limbo } from './dog.js';
import { noit_mon_nam } from './mhitm.js';
import { Monnam } from './mcastu.js';
import { is_fainted } from './eat.js';
import { reset_faint } from './eat.js';
import { unblock_point, block_point, recalc_block_point, cansee, couldsee, Blind } from './vision.js';
import { spot_stop_timers } from './timeout.js';
import { stop_occupation, nomul, unmul } from './allmain.js';
import { getlin } from './wizcmds.js';
import { adjalign } from './attrib.js';
import { noit_Monnam, x_monnam, yelp } from './mhitm.js';
import { weight } from './weight.js';

/* ── hero-property macros (youprop.h), read the same way js/mcastu.js reads
 * them: uprops[<index>].intrinsic|extrinsic.  js/ has three spellings of the
 * hero property table and this is the live one. */
const DEAF_PROP = 16;      /* C prop.h — DEAF */
const STRANGLED_PROP = 27; /* C prop.h — STRANGLED */
function _propOn(id) {
    const p = game.u?.uprops?.[id];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
/* C youprop.h: #define Deaf (u.uprops[DEAF].intrinsic || ... || u.uroleplay.deaf) */
function Deaf() { return _propOn(DEAF_PROP) || !!game.u?.uroleplay?.deaf; }
/* C youprop.h: #define Strangled u.uprops[STRANGLED].intrinsic */
function Strangled() { return _propOn(STRANGLED_PROP); }
/* C youprop.h:16 — #define U_AP_TYPE gy.youmonst.m_ap_type */
function U_AP_TYPE() { return (game.youmonst?.m_ap_type | 0) || M_AP_NOTHING; }
/* C mondata.h:104 — #define is_silent(ptr) ((ptr)->msound == MS_SILENT).  The
 * C call site passes gy.youmonst.data (the HERO's form), not the guard's. */
const MS_SILENT = 0;
function is_silent(_guard) {
    return ((game.youmonst?.data?.msound | 0) === MS_SILENT);
}
/* C do_name.c:1302-1308 pmname(pm, mgender) and monst.h Mgender(mon). */
function Mgender(mtmp) { return mtmp.female ? FEMALE : MALE; }
function pmname(pm, mgender) {
    let g = mgender;
    if (g < MALE || g >= NUM_MGENDERS || !pm?.pmnames?.[g])
        g = NEUTRAL;
    return pm.pmnames[g];
}
/* C hacklib.c strcmpi/strncmpi — case-insensitive compares.  Same bodies as
 * js/objnam.js:2249/2262, which does not export them. */
function _lowc(c) { return (c >= 'A' && c <= 'Z') ? c.toLowerCase() : c; }
function strcmpi(s1, s2) {
    s1 = String(s1 ?? ''); s2 = String(s2 ?? '');
    const n = Math.max(s1.length, s2.length);
    for (let i = 0; i < n; i++) {
        if (!s2[i]) return (s1[i] !== undefined) ? 1 : 0;
        if (!s1[i]) return -1;
        const c1 = _lowc(s1[i]), c2 = _lowc(s2[i]);
        if (c1 !== c2) return (c1 > c2) ? 1 : -1;
    }
    return 0;
}
function strncmpi(s1, s2, n) {
    s1 = String(s1 ?? ''); s2 = String(s2 ?? '');
    for (let i = 0; i < n; i++) {
        if (!s2[i]) return (s1[i] !== undefined) ? 1 : 0;
        if (!s1[i]) return -1;
        const c1 = _lowc(s1[i]), c2 = _lowc(s2[i]);
        if (c1 !== c2) return (c1 > c2) ? 1 : -1;
    }
    return 0;
}
/* C ref: pline.c impossible() — a paniclog line in C; js/steed.js:118 carries
 * the same empty body. */
function impossible(_msg) { /* paniclog only; no screen output in this port */ }
/* C ref: monst.h:250 — #define DEADMONSTER(mon) ((mon)->mhp < 1) */
function DEADMONSTER(mon) { return (mon.mhp | 0) < 1; }
/* C ref: mondata.h sticks(ptr) — the hero's form can hold a monster.  Read only
 * as the second half of `u.ustuck && !sticks(...)`, and u.ustuck is null for
 * every turn of the guard escort. */
function sticks(ptr) { return sticks_real(ptr); }

const BOULDER = 475;
const GOLD_PIECE = 438;
function MON_WEP(mon) { return mon.mw; }

export function vault_occupied(array) {
    const rooms = game.level?.rooms ?? [];
    // for (ptr = array; *ptr; ptr++) — iterate chars until the NUL terminator.
    const str = array == null ? '' : String(array);
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c === 0) /* *ptr == '\0' */
            break;
        const room = rooms[c - ROOMOFFSET];
        if (room && (room.rtype | 0) === VAULT)
            return c; /* return *ptr */
    }
    return 0; /* return '\0' */
}

/* prevent "You hear footsteps.." when inappropriate */
export function gd_sound() {
    return !(vault_occupied(game.u.urooms) || findgd());
}

const COIN_CLASS = 12;

function money_cnt(chain) {
    let total = 0;
    for (let obj = chain; obj; obj = obj.nobj) {
        if ((obj.oclass | 0) === COIN_CLASS)
            total += obj.quan | 0;
    }
    return total;
}

/* vault.c:1256
 *   amount of gold in carried containers
 *
 *   even_if_unknown:
 *     True:  all gold
 *     False: limit to known contents
 *
 *   long
 *   hidden_gold(boolean even_if_unknown)
 *   {
 *       long value = 0L;
 *       struct obj *obj;
 *
 *       for (obj = gi.invent; obj; obj = obj->nobj)
 *           if (Has_contents(obj) && (obj->cknown || even_if_unknown))
 *               value += contained_gold(obj, even_if_unknown);
 *       return value;
 *   }
 *
 * This was an undeclared global read by vault.js:360 (invault's "Please
 * follow me." arm) — a ReferenceError the moment that arm ran.  Has_contents
 * in 5.0 is `(o)->cobj != 0` with the Is_container test COMMENTED OUT
 * (obj.h:333), so a statue with contents counts. */
export function hidden_gold(even_if_unknown) {
    let value = 0;
    for (let obj = game.invent; obj; obj = obj.nobj)
        if (obj.cobj && (obj.cknown || even_if_unknown))
            value += contained_gold(obj, even_if_unknown);
    /* unknown gold stuck inside statues may cause some consternation... */
    return value;
}

export async function paygd(silently) {
    const grd = findgd();
    const umoney = money_cnt(game.fobj);

    if (!umoney || !grd)
        return;

    let gdx, gdy;
    let skipForLoop = false;

    if (game.u.uinvault) {
        if (!silently)
            Your("%ld %s goes into the Magic Memory Vault.", umoney, currency(umoney));
        gdx = game.u.ux;
        gdy = game.u.uy;
    } else {
        if (grd.mpeaceful) {
            skipForLoop = true;
        } else {
            await mnexto(grd, RLOC_NOMSG);
            if (!silently)
                pline("%s remits your gold to the vault.", Monnam(grd));
            gdx = game.level.rooms[grd.egdvroom].lx + rn2(2);
            gdy = game.level.rooms[grd.egdvroom].ly + rn2(2);
            const buf = "To Croesus: here's the gold recovered from " + game.plname + " the " + monPmname(game.u.umonster | 0, game.flags.female ? FEMALE : MALE) + ".";
            make_grave(gdx, gdy, buf);
        }
    }

    if (!skipForLoop) {
        let coins = game.fobj;
        while (coins) {
            const nextcoins = coins.nobj;
            if ((coins.oclass | 0) === COIN_CLASS) {
                freeinv(coins);
                place_object(coins, gdx, gdy);
                await stackobj(coins);
            }
            coins = nextcoins;
        }
    }

    await mongone(grd);
}

export async function grddead(grd) {
    let dispose = await clear_fcorr(grd, true);
    if (!dispose) {
        await relobj(grd, 0, false);
        grd.mhp = 0;
        parkguard(grd);
        dispose = await clear_fcorr(grd, true);
    }
    if (dispose)
        grd.isgd = 0;
    return dispose;
}

/* C ref: dungeon.c:1197 assign_level(dest, src) —
 *     dest->dnum = src->dnum; dest->dlevel = src->dlevel;
 * There is no exported one in js/; every module that needs it spells the two
 * assignments out.  Kept file-local for the same reason. */
function assign_level(dst, src) {
    dst.dnum = src.dnum;
    dst.dlevel = src.dlevel;
}

/* C ref: pline.c:449 verbalize(const char *line, ...) —
 *     Strcpy(tmp, "\""); Strcat(tmp, line); Strcat(tmp, "\"");
 *     vpline(tmp, the_args);
 * i.e. the formatted text wrapped in literal double quotes.  PLINE_VERBALIZE is
 * a sound-channel flag only; vpline's Deaf guard lives in You_hear, not here,
 * so a deaf hero still SEES a verbalize.  js/cmd.js:36497 carries the identical
 * body but does not export it, and importing cmd.js from here would add an edge
 * from the vault subsystem to the 38k-line command file. */
function verbalize(line) {
    return pline('"' + line + '"');
}

/* C ref: sounds.c SetVoice(mon, ...) — selects the voice/pitch for the sound
 * driver.  This port has no sound output at all, and the macro emits no screen
 * output and consumes no RNG. */
function SetVoice(_mon, _a, _b, _c) { /* no sound driver in this port */ }

function sobj_at(otyp, x, y) {
    for (let otmp = game.level?.levelObjects?.[x]?.[y]; otmp; otmp = otmp.nexthere)
        if ((otmp.otyp | 0) === otyp)
            return otmp;
    return null;
}

/* C ref: vault.c:192-202 in_fcorridor(grd, x, y) —
 *     for (fci = EGD(grd)->fcbeg; fci < EGD(grd)->fcend; fci++)
 *         if (x == EGD(grd)->fakecorr[fci].fx && y == EGD(grd)->fakecorr[fci].fy)
 *             return TRUE;
 *     return FALSE; */
export function in_fcorridor(grd, x, y) {
    const egd = EGD(grd);
    if (!egd)
        return false;
    for (let fci = egd.fcbeg | 0; fci < (egd.fcend | 0); fci++)
        if (x === (egd.fakecorr[fci].fx | 0) && y === (egd.fakecorr[fci].fy | 0))
            return true;
    return false;
}

/* C ref: vault.c:281-314 find_guard_dest(guard, &rx, &ry) — the outward spiral
 * that picks the corridor square the guard will escort the hero to.  Returns
 * TRUE and fills <rx,ry> (here: the `out` object's .x/.y, JS having no
 * out-parameters); FALSE only via the impossible() tail.
 *
 * NOTE the C `goto incr_radius` from inside the inner loop: a CORR square whose
 * hero-ward neighbour is neither STONE nor CORR abandons THIS radius entirely
 * rather than continuing the scan, so it is a `break` out of both inner loops,
 * not a `continue`.  RNG-free. */
function find_guard_dest(guard, out) {
    const u = game.u;
    const lev = game.level;
    for (let dd = 2; (dd < ROWNO || dd < COLNO); dd++) {
        let incr_radius = false;
        for (let y = (u.uy | 0) - dd; y <= (u.uy | 0) + dd && !incr_radius; y++) {
            if (y < 0 || y > ROWNO - 1)
                continue;
            for (let x = (u.ux | 0) - dd; x <= (u.ux | 0) + dd; x++) {
                /* C: the x-jump that makes this a ring scan rather than a box. */
                if (y !== (u.uy | 0) - dd && y !== (u.uy | 0) + dd
                    && x !== (u.ux | 0) - dd)
                    x = (u.ux | 0) + dd;
                if (x < 1 || x > COLNO - 1)
                    continue;
                if (guard && ((x === (guard.mx | 0) && y === (guard.my | 0))
                              || (guard.isgd && in_fcorridor(guard, x, y))))
                    continue;
                if (lev.at(x, y)?.typ === CORR) {
                    const lx = (x < (u.ux | 0)) ? x + 1 : (x > (u.ux | 0)) ? x - 1 : x;
                    const ly = (y < (u.uy | 0)) ? y + 1 : (y > (u.uy | 0)) ? y - 1 : y;
                    const lt = lev.at(lx, ly)?.typ;
                    if (lt !== STONE && lt !== CORR) {
                        incr_radius = true; /* C: goto incr_radius */
                        break;
                    }
                    out.x = x;
                    out.y = y;
                    return true;
                }
            }
        }
    }
    /* C: impossible("Not a single corridor on this level?"); tele(); */
    impossible("Not a single corridor on this level?");
    return false;
}

async function fracture_vault_boulder(obj) {
    const x = obj.ox | 0, y = obj.oy | 0;
    remove_object(obj);
    obj.otyp = ROCK;
    obj.oclass = 13; /* GEM_CLASS */
    obj.quan = rn1(60, 7);
    obj.owt = weight(obj);
    obj.where = 1;
    place_object(obj, x, y);
    await stackobj(obj);
    newsym(x, y);
    return true;
}

export async function invault() {
    const u = game.u;
    let guard;
    let otmp;
    let spotted;
    let trycount;
    let vaultroom = vault_occupied(u.urooms);
    let vgdeathcount;

    if (!vaultroom) {
        u.uinvault = 0;
        return;
    }
    /* after a couple of guards don't come back from their trips to
       the vault, future guards become more reluctant to turn up (even
       if summoned via whistle) */
    vgdeathcount = (game.mvitals?.[PM_GUARD]?.died) | 0;
    if (vgdeathcount < 2
        || (vgdeathcount < 50 && !rn2(vgdeathcount * vgdeathcount)))
        u.uinvault = (u.uinvault | 0) + 1;
    if ((u.uinvault | 0) < VAULT_GUARD_TIME
        || ((u.uinvault | 0) % (VAULT_GUARD_TIME / 2)) !== 0)
        return;

    guard = findgd();
    if (!guard) {
        /* if time ok and no guard now. */
        let buf;
        let x, y, gdx, gdy, typ;
        let umoney;
        const rc = { x: 0, y: 0 };

        /* first find the goal for the guard */
        if (!find_guard_dest(null, rc))
            return;
        gdx = rc.x;
        gdy = rc.y;
        vaultroom -= ROOMOFFSET;

        /* next find a good place for a door in the wall */
        x = u.ux | 0;
        y = u.uy | 0;
        const typ_at = (ax, ay) => game.level.at(ax, ay)?.typ;
        if (typ_at(x, y) !== ROOM) { /* player dug a door and is in it */
            if (typ_at(x + 1, y) === ROOM) {
                x = x + 1;
            } else if (typ_at(x, y + 1) === ROOM) {
                y = y + 1;
            } else if (typ_at(x - 1, y) === ROOM) {
                x = x - 1;
            } else if (typ_at(x, y - 1) === ROOM) {
                y = y - 1;
            } else if (typ_at(x + 1, y + 1) === ROOM) {
                x = x + 1;
                y = y + 1;
            } else if (typ_at(x - 1, y - 1) === ROOM) {
                x = x - 1;
                y = y - 1;
            } else if (typ_at(x + 1, y - 1) === ROOM) {
                x = x + 1;
                y = y - 1;
            } else if (typ_at(x - 1, y + 1) === ROOM) {
                x = x - 1;
                y = y + 1;
            }
        }
        while (typ_at(x, y) === ROOM) {
            const dx = (gdx > x) ? 1 : (gdx < x) ? -1 : 0;
            const dy = (gdy > y) ? 1 : (gdy < y) ? -1 : 0;
            if (Math.abs(gdx - x) >= Math.abs(gdy - y))
                x += dx;
            else
                y += dy;
        }
        if (u_at(x, y)) {
            if (typ_at(x + 1, y) === HWALL || typ_at(x + 1, y) === DOOR)
                x = x + 1;
            else if (typ_at(x - 1, y) === HWALL || typ_at(x - 1, y) === DOOR)
                x = x - 1;
            else if (typ_at(x, y + 1) === VWALL || typ_at(x, y + 1) === DOOR)
                y = y + 1;
            else if (typ_at(x, y - 1) === VWALL || typ_at(x, y - 1) === DOOR)
                y = y - 1;
            else
                return;
        }

        /* make something interesting happen */
        /* C vault.c:407 — makemon(&mons[PM_GUARD], x, y, MM_EGD | MM_NOMSG).
         * js/mklev.js makemon() keys its object branch off `.mnum`, which
         * permonstTemplate objects do not carry, so every js/ caller passes the
         * monster INDEX instead of a permonst pointer. */
        if (!(guard = await makemon(PM_GUARD, x, y, MM_EGD | MM_NOMSG)))
            return;
        guard.isgd = 1;
        guard.mpeaceful = 1;
        set_malign(guard);
        EGD(guard).gddone = 0;
        EGD(guard).ogx = x;
        EGD(guard).ogy = y;
        assign_level(EGD(guard).gdlevel, u.uz);
        EGD(guard).vroom = vaultroom;
        EGD(guard).warncnt = 0;

        /* ensure the guard doesn't respawn again next turn if killed
           immediately */
        u.uinvault = (u.uinvault | 0) + 1;

        await reset_faint(); /* if fainted - wake up */
        /* if there are any boulders in the guard's way, destroy them */
        if ((otmp = sobj_at(BOULDER, guard.mx, guard.my)) !== null) {
            let count = 0;
            const bname = simpleonames(otmp);
            do {
                await fracture_vault_boulder(otmp);
                count++;
                otmp = sobj_at(BOULDER, guard.mx, guard.my);
            } while (otmp);
            const text = count === 1
                ? `A ${bname} shatter.` : `${makeplural(bname)} shatter.`;
            if (Blind())
                await You_hear(text);
            else
                await You_see(text);
        }
        spotted = canspotmon(guard);
        if (spotted) {
            pline("Suddenly one of the Vault's "
                  + makeplural(pmname(guard.data, Mgender(guard)))
                  + " enters!");
            newsym(guard.mx, guard.my);
        } else {
            pline("Someone else has entered the Vault.");
            /* make sure that hero who can't see the guard knows where the
               wall is breeched, otherwise we couldn't follow the guard out */
            map_invisible(guard.mx, guard.my);
        }

        if (u.uswallow) {
            if (!Deaf()) {
                SetVoice(guard, 0, 80, 0);
                verbalize("What's going on here?");
            }
            if (!spotted)
                pline("The other presence vanishes.");
            await gd_mongone(guard);
            return;
        }
        if (U_AP_TYPE() === M_AP_OBJECT || u.uundetected) {
            if (U_AP_TYPE() === M_AP_OBJECT
                && game.youmonst.mappearance !== GOLD_PIECE)
                if (!Deaf()) {
                    SetVoice(guard, 0, 80, 0);
                    /* C: verbalize("Hey!  Who left that %s in here?",
                     *              mimic_obj_name(&gy.youmonst)); */
                    const disguise = { otyp: game.youmonst.mappearance | 0,
                                       quan: 1, known: 1, o_id: 0 };
                    verbalize(`Hey!  Who left that ${simpleonames(disguise)} in here?`);
                }
            /* C: pline("Puzzled, %s turns around and leaves.", mhe(guard)); */
            pline(`Puzzled, ${mhe(guard)} turns around and leaves.`);
            await gd_mongone(guard);
            return;
        }
        if (Strangled() || is_silent(guard) || (game.multi | 0) < 0) {
            if (Deaf()) {
                pline(noit_Monnam(guard) + " huffs and turns to leave.");
            } else {
                SetVoice(guard, 0, 80, 0);
                verbalize("I'll be back when you're ready to speak to me!");
            }
            await gd_mongone(guard);
            return;
        }

        await stop_occupation(); /* if occupied, stop it *now* */
        if ((game.multi | 0) > 0) {
            nomul(0);
            await unmul(null);
        }
        buf = '';
        trycount = 5;
        do {
            buf = await getlin(Deaf() ? "You are required to supply your name. -"
                                     : "\"Hello stranger, who are you?\" -");
            /* C: buf[0] == '\033' (ESC) leaves the string EMPTY for the
             * !buf[0] retry test; js/wizcmds.js getlin returns the ESC
             * sentinel as its whole result. */
            if (buf === '\x1b')
                buf = '';
            buf = mungspaces(buf);
        } while (!buf && --trycount > 0);

        if ((u.ualign?.type | 0) === A_LAWFUL
            /* ignore trailing text, in case player includes rank */
            && strncmpi(buf, game.plname, String(game.plname || '').length) !== 0) {
            adjalign(-1); /* Liar! */
        }

        if (!strcmpi(buf, "Croesus") || !strcmpi(buf, "Kroisos")
            || !strcmpi(buf, "Creosote")) { /* Discworld */
            /* C vault.c:512-542 — Croesus is the one name that makes a guard
             * recognize the hero, unless Croesus has already died. */
            const croesusDied = !!(game.mvitals?.[PM_CROESUS]?.died | 0);
            if (!croesusDied) {
                if (Deaf()) {
                    if (!Blind())
                        pline(`${noit_Monnam(guard)} waves goodbye.`);
                } else {
                    SetVoice(guard, 0, 80, 0);
                    verbalize("Oh, yes, of course.  Sorry to have disturbed you.");
                }
                await gd_mongone(guard);
            } else {
                await setmangry(guard, false);
                if (Deaf()) {
                    if (!Blind())
                        pline(`${noit_Monnam(guard)} mouths something and looks very angry!`);
                } else {
                    SetVoice(guard, 0, 80, 0);
                    verbalize("Back from the dead, are you?  I'll remedy that!");
                }
                if (!MON_WEP(guard)) {
                    guard.weapon_check = NEED_HTH_WEAPON;
                    await mon_wield_item(guard);
                }
            }
            return;
        }
        if (Deaf()) {
            pline(noit_Monnam(guard) + " doesn't "
                  + (Blind() ? "" : "appear to ") + "recognize you.");
        } else {
            SetVoice(guard, 0, 80, 0);
            verbalize("I don't know you.");
        }
        umoney = money_cnt(game.invent);
        if (!umoney && !hidden_gold(true)) {
            if (Deaf()) {
                pline(noit_Monnam(guard) + " stomps"
                      + (Blind() ? "" : " and beckons") + ".");
            } else {
                SetVoice(guard, 0, 80, 0);
                verbalize("Please follow me.");
            }
        } else {
            if (!umoney) {
                if (Deaf()) {
                    if (!Blind())
                        pline(noit_Monnam(guard) + " glares at you"
                              + (game.invent ? "r stuff" : "") + ".");
                } else {
                    SetVoice(guard, 0, 80, 0);
                    verbalize("You have hidden gold.");
                }
            }
            if (Deaf()) {
                if (!Blind()) {
                    /* C vault.c:571-576: deaf heroes receive the guard's
                     * demand visually rather than through verbalize(). */
                    const possessive = guard.female ? 'her' : 'his';
                    pline(`${noit_Monnam(guard)} holds out ${possessive} palm and beckons with ${possessive} other hand.`);
                }
            } else {
                SetVoice(guard, 0, 80, 0);
                verbalize("Most likely all your gold was stolen from this vault.");
                SetVoice(guard, 0, 80, 0);
                verbalize("Please drop that gold and follow me.");
            }
            EGD(guard).dropgoldcnt = (EGD(guard).dropgoldcnt | 0) + 1;
        }
        EGD(guard).gdx = gdx;
        EGD(guard).gdy = gdy;
        EGD(guard).fcbeg = 0;
        EGD(guard).fakecorr[0].fx = x;
        EGD(guard).fakecorr[0].fy = y;
        typ = game.level.at(x, y).typ;
        if (!IS_WALL(typ)) {
            /* guard arriving at non-wall implies a door; vault wall was
               dug into an empty doorway */
            const vlt = EGD(guard).vroom;
            const lowx = game.level.rooms[vlt].lx, hix = game.level.rooms[vlt].hx;
            const lowy = game.level.rooms[vlt].ly, hiy = game.level.rooms[vlt].hy;

            if (x === lowx - 1 && y === lowy - 1)
                typ = TLCORNER;
            else if (x === hix + 1 && y === lowy - 1)
                typ = TRCORNER;
            else if (x === lowx - 1 && y === hiy + 1)
                typ = BLCORNER;
            else if (x === hix + 1 && y === hiy + 1)
                typ = BRCORNER;
            else if (y === lowy - 1 || y === hiy + 1)
                typ = HWALL;
            else if (x === lowx - 1 || x === hix + 1)
                typ = VWALL;

            /* we lack access to the original wall_info bit mask for this
               former wall location so recreate it */
            game.level.at(x, y).typ = typ; /* wall; changed to door below */
            game.level.at(x, y).wall_info = 0;
            xy_set_wall_state(x, y);
        }
        EGD(guard).fakecorr[0].ftyp = typ;
        EGD(guard).fakecorr[0].flags = game.level.at(x, y).flags;
        /* guard's entry point where confrontation with hero takes place */
        spot_stop_timers(x, y, MELT_ICE_AWAY);
        game.level.at(x, y).typ = DOOR;
        game.level.at(x, y).doormask = D_NODOOR;
        unblock_point(x, y); /* empty doorway doesn't block light */
        EGD(guard).fcend = 1;
        EGD(guard).warncnt = 1;
    }
}

export function newegd(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!EGD(mtmp)) {
        mtmp.mextra.egd = {};
        for (const k of Object.keys(mtmp.mextra.egd))
            delete mtmp.mextra.egd[k];
        mtmp.mextra.egd.parentmid = mtmp.m_id;
    }
}

/* C ref: vault.c:203-215 findgd() — the fmon scan.
 *
 *   for (mtmp = fmon; mtmp; mtmp = mtmp->nmon) {
 *       if (mtmp->isgd && on_level(&EGD(mtmp)->gdlevel, &u.uz)) {
 *           if (!mtmp->mx && !EGD(mtmp)->gddone)
 *               mtmp->mhp = mtmp->mhpmax;
 *           return mtmp;
 *       }
 *   }
 *
 * Note there is deliberately NO DEADMONSTER() filter here — C comments that
 * this "might find a guard parked at <0,0> since it'll be on fmon list", and
 * the <0,0> arm below is what re-heals such a parked guard.  Ported verbatim.
 *
 * WIRE_PENDING — vault.c:216-231's second loop (a guard still sitting on
 * gm.migrating_mons for this level is unlinked and re-placed at <0,0>) is NOT
 * ported: the port has no migrating_mons chain, so there is nothing to scan and
 * C's fallthrough result (NULL) is reproduced exactly.  Restore that loop with
 * the migrating-monster subsystem, not before. */
function findgd() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        /* C dereferences EGD(mtmp)->gdlevel unguarded; in the port newegd()
         * (above) creates the egd extra with only `parentmid`, and invault()
         * assigns gdlevel afterwards, so an egd without gdlevel is reachable
         * here where it is not in C.  The extra `egd?.gdlevel` test is a
         * null-guard for that window only — it never selects a different
         * monster than C would. */
        const egd = EGD(mtmp);
        if (mtmp.isgd && egd?.gdlevel && on_level(egd.gdlevel, game.u.uz)) {
            if (!(mtmp.mx | 0) && !egd.gddone)
                mtmp.mhp = mtmp.mhpmax;
            return mtmp;
        }
    }
    return null;
}
import { Your } from './do_wear.js';
export { Your };
export { currency } from './cmd.js';
export function freeinv(obj) { return freeinv_real(obj); }
export async function mnexto(mon, flags) { return await mnexto_real(mon, flags); }
/* mongone's real body is js/mklev.js (C home mon.c:3253).  This file's
 * throw-stub of the same name shadowed it for gd_sound()'s own call above.
 * It is now IMPORTED at the top as well: `export ... from` is a re-export and
 * creates NO local binding, so invault()'s four mongone(guard) calls were a
 * ReferenceError while this line read as if they were bound. */
export { mongone };

/* ════════════════════════════════════════════════════════════════════════════
 * THE GUARD'S ESCORT — vault.c:48-171 and :646-1203.
 *
 * Everything below was a pair of one-line stubs (`clear_fcorr() { return true }`
 * and an empty `parkguard()`), and js/monmove.js's isgd arm returned
 * MMOVE_NOTHING with the comment "Stub: gd_move not ported".  The guard made by
 * invault() therefore stood on the vault-wall breach forever: the hero's very
 * next westward step walked into him and became an ATTACK.
 * ════════════════════════════════════════════════════════════════════════════ */

/* C ref: mkobj.c ROCK / BOULDER otyps (objects.h `sn` order). */
const ROCK = 474;

/* C rm.h:534 remove_monster(x,y) — clear the map-grid occupant before the
 * following newsym() sees the vacated square.  The monster remains linked on
 * fmon and keeps mx/my until place_monster() assigns its destination; the
 * shared m_at() models that missing grid slot with _mapRemoved. */
function remove_monster(x, y) {
    const mtmp = m_at(x, y);
    if (mtmp)
        mtmp._mapRemoved = true;
}

/* C ref: vault.c:123-140 blackout(x, y) — as the temporary corridor is removed,
 * set STONE locations and their neighbours unlit so a light spell cast inside
 * the corridor does not reappear in a later tunnel.
 * unset_seenv() (display.c) has no js/ body; the seenv bookkeeping only affects
 * which wall-angle a REMEMBERED wall is drawn from, and every cell this touches
 * is reverting to STONE, so the lit/waslit half is what is portable today. */
function blackout(x, y) {
    for (let i = x - 1; i <= x + 1; ++i)
        for (let j = y - 1; j <= y + 1; ++j) {
            if (!isok(i, j))
                continue;
            const lev = game.level.at(i, j);
            if (!lev)
                continue;
            if (lev.typ === STONE) {
                lev.lit = false;
                lev.waslit = false;
            }
            /* C: unset_seenv(lev, x, y, i, j) — no js/ counterpart. */
        }
}

/* C ref: vault.c:48-116 clear_fcorr(grd, forceshow) — try to remove the
 * temporary corridor; returns FALSE (and leaves it) while the hero, another
 * monster or the hero's ball still occupies the next square to revert. */
async function clear_fcorr(grd, forceshow) {
    const egrd = EGD(grd);
    const u = game.u;
    let sawcorridor = false;
    let fcbeg;

    if (!on_level(egrd.gdlevel, u.uz))
        return true;

    /* note: guard remains on 'fmon' list (alive or dead, at off-map
       coordinate <0,0>), until temporary corridor has been removed */
    while ((fcbeg = egrd.fcbeg | 0) < (egrd.fcend | 0)) {
        const fcx = egrd.fakecorr[fcbeg].fx | 0;
        const fcy = egrd.fakecorr[fcbeg].fy | 0;
        if ((DEADMONSTER(grd) || !in_fcorridor(grd, u.ux | 0, u.uy | 0))
            && egrd.gddone)
            forceshow = true;
        if ((u_at(fcx, fcy) && !DEADMONSTER(grd))
            || (!forceshow && couldsee(fcx, fcy)))
            /* C's third disjunct is the Punished/uball test; this port has no
             * ball-and-chain, so `Punished` is permanently false. */
            return false;

        const mtmp = m_at(fcx, fcy);
        if (mtmp) {
            if (mtmp.isgd)
                return false;
            /* C: yelp() a pet, then rloc()/m_into_limbo the monster out of the
             * way.  Reached only when something wandered into the corridor
             * behind the hero. */
            if (mtmp.mtame)
                yelp(mtmp);
            if (!await rloc(mtmp, RLOC_MSG))
                await m_into_limbo(mtmp);
        }
        const lev = game.level.at(fcx, fcy);
        if (lev.typ === CORR && cansee(fcx, fcy))
            sawcorridor = true;
        lev.typ = egrd.fakecorr[fcbeg].ftyp;
        lev.flags = egrd.fakecorr[fcbeg].flags;
        if (IS_STWALL(lev.typ)) {
            const trap = t_at(fcx, fcy);
            if (trap)
                deltrap(trap);
            if (lev.typ === STONE)
                blackout(fcx, fcy);
        }
        del_engr_at(fcx, fcy);
        map_location(fcx, fcy, 1); /* bypass vision */
        recalc_block_point(fcx, fcy);
        game.vision_full_recalc = 1;
        egrd.fcbeg = (egrd.fcbeg | 0) + 1;
    }
    if (sawcorridor)
        pline("The corridor disappears.");
    if (IS_OBSTRUCTED(game.level.at(u.ux | 0, u.uy | 0).typ)
        && (u.uhp | 0) > 0)
        pline("You are encased in rock.");
    return true;
}

/* C mon.c:2784-2790 m_detach(): a monster leaving the map has its square
 * redrawn (remove_monster + newsym).  This port's mongone() does not vacate the
 * map (monster-lifetime keystone), so redraw the vacated square here. */
async function gd_mongone(grd) {
    const ox = grd.mx | 0, oy = grd.my | 0;
    await mongone(grd);
    if (ox && m_at(ox, oy) !== grd) newsym(ox, oy);
}

/* C ref: vault.c:144-151 restfakecorr(grd) — "it seems you left the corridor,
 * let the guard disappear". */
async function restfakecorr(grd) {
    if (await clear_fcorr(grd, false)) {
        grd.isgd = 0; /* dmonsfree() should delete this mon */
        await mongone(grd);
    }
}

/* C ref: vault.c:155-171 parkguard(grd) — move guard (dead or alive) to <0,0>
 * until the temporary corridor has been removed. */
function parkguard(grd) {
    if (grd.mx | 0) {
        remove_monster(grd.mx | 0, grd.my | 0);
        newsym(grd.mx | 0, grd.my | 0);
    }
    if (m_at(0, 0) !== grd)
        place_monster(grd, 0, 0);
    EGD(grd).ogx = grd.mx | 0;
    EGD(grd).ogy = grd.my | 0;
}

async function wallify_vault(grd) {
    const vlt = EGD(grd).vroom | 0;
    const room = game.level.rooms[vlt];
    const lox = (room.lx | 0) - 1, hix = (room.hx | 0) + 1;
    const loy = (room.ly | 0) - 1, hiy = (room.hy | 0) + 1;
    let fixed = false;
    let movedgold = false;

    for (let x = lox; x <= hix; x++)
        for (let y = loy; y <= hiy; y++) {
            /* if not on the room boundary, skip ahead */
            if (x !== lox && x !== hix && y !== loy && y !== hiy)
                continue;
            const lev = game.level.at(x, y);
            if (!lev)
                continue;
            if ((!IS_WALL(lev.typ) || g_at(x, y)
                 || sobj_at(ROCK, x, y) || sobj_at(BOULDER, x, y))
                && !in_fcorridor(grd, x, y)) {
                const mon = m_at(x, y);
                if (mon && mon !== grd) {
                    /* C vault.c:669-674: clear anything that wandered onto a
                     * boundary square before restoring the vault wall. */
                    if (mon.mtame)
                        yelp(mon);
                    if (!await rloc(mon, RLOC_MSG))
                        await m_into_limbo(mon);
                }
                if (g_at(x, y)) {
                    await move_gold(g_at(x, y), vlt);
                    movedgold = true;
                }
                let rocks;
                while ((rocks = sobj_at(ROCK, x, y)) || (rocks = sobj_at(BOULDER, x, y))) {
                    /* C vault.c:683-690: rocks and boulders are subsumed
                     * into the restored wall and deleted from both chains. */
                    remove_object(rocks);
                    await obfree(rocks, null);
                }
                const trap = t_at(x, y);
                if (trap)
                    deltrap(trap);

                let typ;
                if (x === lox)
                    typ = (y === loy) ? TLCORNER : (y === hiy) ? BLCORNER : VWALL;
                else if (x === hix)
                    typ = (y === loy) ? TRCORNER : (y === hiy) ? BRCORNER : VWALL;
                else /* not left or right side, must be top or bottom */
                    typ = HWALL;

                lev.typ = typ;
                lev.wall_info = 0;
                xy_set_wall_state(x, y); /* set WA_MASK bits in .wall_info */
                del_engr_at(x, y);
                /* hack: player knows walls are restored because of the message
                   below, so show this on the screen. */
                const viz = game.viz_array;
                const tmp_viz = viz ? viz[y][x] : 0;
                if (viz) viz[y][x] = IN_SIGHT | COULD_SEE;
                newsym(x, y);
                if (viz) viz[y][x] = tmp_viz;
                block_point(x, y);
                fixed = true;
            }
        }

    if (movedgold || fixed) {
        if (in_fcorridor(grd, grd.mx | 0, grd.my | 0)
            || cansee(grd.mx | 0, grd.my | 0))
            pline(noit_Monnam(grd) + " whispers an incantation.");
        else
            You_hear("a distant chant.");
        if (movedgold)
            pline("A mysterious force moves the gold into the vault.");
        if (fixed)
            pline("The damaged vault's walls are magically restored!");
    }
}

/* C ref: vault.c:734-748 gd_mv_monaway(grd, nx, ny) — shove whatever is standing
 * on the guard's next square out of the way. */
async function gd_mv_monaway(grd, nx, ny) {
    const mtmp = m_at(nx, ny);
    if (!mtmp || mtmp === grd)
        return;
    /* C vault.c:738-744: clear the destination by relocating its occupant;
     * if no legal square exists, send it to limbo.  rloc() is synchronous in
     * this port, matching the guard movement call site's synchronous contract. */
    if (!Deaf()) {
        SetVoice(grd, 0, 80, 0);
        await verbalize('Out of my way, scum!');
    }
    if (!await rloc(mtmp, RLOC_ERR | RLOC_MSG) || m_at(nx, ny))
        await m_into_limbo(mtmp);
    recalc_block_point(nx, ny);
}

/* C ref: vault.c:836-866 gd_move_cleanup(grd, semi_dead, disappear_msg_seen).
 * "The following is a kludge.  We need to keep the guard around in order to be
 * able to make the fake corridor disappear as the player moves out of it, but we
 * also need the guard out of the way."
 * return 1: guard moved, -2: died */
async function gd_move_cleanup(grd, semi_dead, disappear_msg_seen) {
    const u = game.u;
    const x = grd.mx | 0, y = grd.my | 0;
    const see_guard = canspotmon(grd);

    parkguard(grd); /* move to <0,0> */
    await wallify_vault(grd);
    await restfakecorr(grd);
    if (!semi_dead && (in_fcorridor(grd, u.ux | 0, u.uy | 0) || cansee(x, y))) {
        if (!disappear_msg_seen && see_guard)
            pline("Suddenly, " + noit_mon_nam(grd) + " disappears.");
        return 1;
    }
    return -2;
}

/* C ref: vault.c:869-885 gd_letknow(grd) — the guard has turned hostile. */
function gd_letknow(grd) {
    /* C vault.c:870-874: an unseen or invisible guard is announced by sound;
     * `cansee` alone is insufficient because the guard may be invisible or
     * undetected.  mon_visible is display.h's exact predicate. */
    if (!cansee(grd.mx | 0, grd.my | 0) || !mon_visible(grd)) {
        let hasWhistle = false;
        for (let obj = grd.minvent; obj; obj = obj.nobj)
            if ((obj.otyp | 0) === 245) { hasWhistle = true; break; }
        You_hear(hasWhistle ? "the shrill sound of a guard's whistle"
                            : "angry shouting");
        return;
    }
    /* C vault.c:876-883: adjacent guards confront; otherwise they are seen
     * approaching. x_monnam supplies C's article/adjective handling. */
    const name = x_monnam(grd, ARTICLE_A, 'angry', 0, false);
    pline(um_dist(grd.mx | 0, grd.my | 0, 2)
          ? `You see ${name} approaching.`
          : `You are confronted by ${name}.`);
}

/* C mon.c:2648 mpickgold() — consume the coin pile at the monster's square
 * and put it on the monster inventory chain. */
async function mpickgold(grd) {
    const gold = g_at(grd.mx | 0, grd.my | 0);
    if (!gold)
        return false;
    remove_object(gold);
    gold.where = OBJ_MINVENT;
    await add_to_minv(grd, gold);
    newsym(grd.mx | 0, grd.my | 0);
    return true;
}

/* C vault.c:632-644 move_gold() — return loose coins on the vault boundary
 * to a random square inside the vault room. */
async function move_gold(gold, vroom) {
    const oldx = gold.ox | 0, oldy = gold.oy | 0;
    remove_object(gold);
    newsym(oldx, oldy);
    const room = game.level.rooms[vroom | 0];
    const nx = (room.lx | 0) + rn2(2);
    const ny = (room.ly | 0) + rn2(2);
    place_object(gold, nx, ny);
    await stackobj(gold);
    newsym(nx, ny);
}

async function gd_pick_corridor_gold(grd, goldx, goldy) {
    const guardx = grd.mx | 0, guardy = grd.my | 0;
    const underHero = (goldx | 0) === (game.u.ux | 0)
                   && (goldy | 0) === (game.u.uy | 0);
    const seen = cansee(goldx | 0, goldy | 0);
    let moved = false;
    if (underHero) {
        const gold = g_at(goldx | 0, goldy | 0);
        if (!gold)
            return;
        const guardDist = (guardx - game.u.ux) ** 2 + (guardy - game.u.uy) ** 2;
        if (guardDist > 2 && seen) {
            let best = { x: guardx, y: guardy };
            let bestDist = guardDist;
            for (let tries = 0; tries < 10; tries++) {
                const candidate = enexto_out(goldx | 0, goldy | 0, grd.data);
                if (!candidate) continue;
                const heroDist = (candidate.x - game.u.ux) ** 2
                               + (candidate.y - game.u.uy) ** 2;
                const guardCandidateDist = (candidate.x - guardx) ** 2
                                          + (candidate.y - guardy) ** 2;
                const bestGuardDist = (best.x - guardx) ** 2
                                    + (best.y - guardy) ** 2;
                if (heroDist < bestDist
                    || (heroDist === bestDist && guardCandidateDist < bestGuardDist)) {
                    best = candidate;
                    bestDist = heroDist;
                }
            }
            if (bestDist < guardDist) {
                remove_monster(guardx, guardy);
                newsym(guardx, guardy);
                place_monster(grd, best.x, best.y);
                newsym(grd.mx, grd.my);
                moved = true;
            }
        }
        /* C extracts the hero-square object directly even when the guard was
         * moved closer first; it does not require the guard to stand on the
         * hero's square. */
        remove_object(gold);
        gold.where = OBJ_MINVENT;
        await add_to_minv(grd, gold);
        newsym(goldx | 0, goldy | 0);
    } else {
        if ((goldx | 0) !== guardx || (goldy | 0) !== guardy) {
            await gd_mv_monaway(grd, goldx | 0, goldy | 0);
            if (seen) {
                remove_monster(guardx, guardy);
                newsym(guardx, guardy);
                place_monster(grd, goldx | 0, goldy | 0);
            }
        }
        await mpickgold(grd);
    }
    if (seen)
        pline(`${Monnam(grd)}${grd.mpeaceful && (EGD(grd).warncnt | 0) > 5
            ? ' calms down and' : ''} picks up the gold${underHero ? ' from beneath you' : ''}.`);
    if (moved) {
        remove_monster(grd.mx | 0, grd.my | 0);
        newsym(grd.mx | 0, grd.my | 0);
        place_monster(grd, guardx, guardy);
        newsym(guardx, guardy);
    }
}

/* C ref: vault.c:888-1203 gd_move(grd).
 * return  1: guard moved, 0: guard didn't, -1: let m_move do it, -2: died */
export async function gd_move(grd) {
    const u = game.u;
    const egrd = EGD(grd);
    let x, y, nx, ny, m, n, ex, ey;
    let dx, dy, ggx = 0, ggy = 0, fci;
    let typ, crm;
    let umoney = 0;
    let goldincorridor = false, u_in_vault = false, grd_in_vault = false;
    const semi_dead = DEADMONSTER(grd);
    let u_carry_gold = false, newspot = false;

    if (!on_level(egrd.gdlevel, u.uz))
        return -1;

    if (semi_dead || !(grd.mx | 0) || egrd.gddone) {
        egrd.gddone = 1;
        return await gd_move_cleanup(grd, semi_dead, false);
    }

    u_in_vault = vault_occupied(u.urooms) ? true : false;
    grd_in_vault = in_rooms(grd.mx | 0, grd.my | 0, VAULT)?.length ? true : false;
    if (!u_in_vault && !grd_in_vault)
        await wallify_vault(grd);

    if (!grd.mpeaceful) {
        /* C vault.c:914-928: a hostile guard outside the vault cannot remain
         * in its escort corridor once the hero has left; relocate it, restore
         * the vault walls, then announce the confrontation. */
        if (!u_in_vault
            && (grd_in_vault
                || (in_fcorridor(grd, grd.mx | 0, grd.my | 0)
                    && !in_fcorridor(grd, u.ux | 0, u.uy | 0)))) {
            await rloc(grd, RLOC_MSG);
            await wallify_vault(grd);
            if (!in_fcorridor(grd, grd.mx | 0, grd.my | 0))
                await clear_fcorr(grd, true);
            gd_letknow(grd);
            return -1;
        }
        if (!in_fcorridor(grd, grd.mx | 0, grd.my | 0))
            await clear_fcorr(grd, true);
        return -1;
    }
    if (Math.abs((egrd.ogx | 0) - (grd.mx | 0)) > 1
        || Math.abs((egrd.ogy | 0) - (grd.my | 0)) > 1)
        return -1; /* teleported guard - treat as monster */

    if (egrd.witness) {
        /* C vault.c:932-941 — the guard remembers seeing gold consumed or
         * destroyed, then turns hostile before normal escort processing. */
        if (!Deaf()) {
            SetVoice(grd, 0, 80, 0);
            await verbalize(`How dare you ${(egrd.witness & 0x01)
                ? 'consume' : 'destroy'} that gold, scoundrel!`);
        }
        egrd.witness = 0;
        grd.mpeaceful = 0;
        return -1;
    }

    umoney = money_cnt(game.invent);
    u_carry_gold = (umoney > 0 || hidden_gold(true) > 0);
    if ((egrd.fcend | 0) === 1) {
        if (u_in_vault && (u_carry_gold || um_dist(grd.mx | 0, grd.my | 0, 1))) {
            if ((egrd.warncnt | 0) === 3 && !Deaf()) {
                const buf = (u_carry_gold
                             ? (!umoney ? "drop that hidden gold and "
                                        : "drop that gold and ")
                             : "") + "follow me!";
                SetVoice(grd, 0, 80, 0);
                if ((egrd.dropgoldcnt | 0) || !u_carry_gold)
                    await verbalize("I repeat, " + buf);
                else
                    await verbalize(await upstart(buf));
                if (u_carry_gold)
                    egrd.dropgoldcnt = (egrd.dropgoldcnt | 0) + 1;
            }
            if ((egrd.warncnt | 0) === 7) {
                /* C vault.c:963-978 — the final warning makes the guard
                 * hostile, relocates it, and restores the first fake-corridor
                 * square it occupied. */
                const oldx = grd.mx | 0, oldy = grd.my | 0;
                if (!Deaf()) {
                    SetVoice(grd, 0, 80, 0);
                    await verbalize("You've been warned, knave!");
                }
                grd.mpeaceful = 0;
                await mnexto(grd, RLOC_NOMSG);
                const first = egrd.fakecorr?.[0];
                if (first) {
                    const lev = game.level.at(oldx, oldy);
                    lev.typ = first.ftyp | 0;
                    lev.flags = first.flags | 0;
                    recalc_block_point(oldx, oldy);
                    del_engr_at(oldx, oldy);
                    newsym(oldx, oldy);
                }
                return -1;
            }
            /* not fair to get mad when (s)he's fainted or paralyzed */
            if (!is_fainted() && (game.multi | 0) >= 0)
                egrd.warncnt = (egrd.warncnt | 0) + 1;
            return 0;
        }

        if (!u_in_vault) {
            if (u_carry_gold) { /* player teleported */
                /* C vault.c:987-1000: relocate the guard, restore the first
                 * fake-corridor square, and make the guard hostile so it can
                 * pursue the hero's stolen gold. */
                const oldx = grd.mx | 0, oldy = grd.my | 0;
                await rloc(grd, RLOC_MSG);
                const first = egrd.fakecorr?.[0];
                if (first) {
                    const lev = game.level.at(oldx, oldy);
                    lev.typ = first.ftyp | 0;
                    lev.flags = first.flags | 0;
                    recalc_block_point(oldx, oldy);
                    del_engr_at(oldx, oldy);
                    newsym(oldx, oldy);
                }
                grd.mpeaceful = 0;
                gd_letknow(grd);
                return -1;
            } else {
                if (!Deaf()) {
                    SetVoice(grd, 0, 80, 0);
                    await verbalize("Well, begone.");
                }
                egrd.gddone = 1;
                return await gd_move_cleanup(grd, semi_dead, false);
            }
        }
    }

    if ((egrd.fcend | 0) > 1) {
        if ((egrd.fcend | 0) > 2 && in_fcorridor(grd, grd.mx | 0, grd.my | 0)
            && !egrd.gddone && !in_fcorridor(grd, u.ux | 0, u.uy | 0)
            && (game.level.at(egrd.fakecorr[0].fx | 0,
                              egrd.fakecorr[0].fy | 0).typ
                === (egrd.fakecorr[0].ftyp | 0))) {
            pline(noit_Monnam(grd) + ", confused, disappears.");
            return await gd_move_cleanup(grd, semi_dead, true);
        }
        if (u_carry_gold && (in_fcorridor(grd, u.ux | 0, u.uy | 0)
                             /* cover a 'blind' spot */
                             || ((egrd.fcend | 0) > 1 && u_in_vault))) {
            if (!(grd.mx | 0)) {
                await restfakecorr(grd);
                return -2;
            }
            if ((egrd.warncnt | 0) < 6) {
                egrd.warncnt = 6;
                if (Deaf()) {
                    if (!Blind()) {
                        const possessive = grd.female ? 'her' : 'his';
                        pline(`${noit_Monnam(grd)} holds out ${possessive} palm demandingly!`);
                    }
                } else {
                    SetVoice(grd, 0, 80, 0);
                    await verbalize("Drop all your gold, scoundrel!");
                }
                return 0;
            } else {
                if (Deaf()) {
                    if (!Blind()) {
                        const possessive = grd.female ? 'her' : 'his';
                        pline(`${noit_Monnam(grd)} rubs ${possessive} hands with enraged delight!`);
                    }
                } else {
                    SetVoice(grd, 0, 80, 0);
                    await verbalize("So be it, rogue!");
                }
                grd.mpeaceful = 0;
                return -1;
            }
        }
    }
    m = n = 0;
    for (fci = egrd.fcbeg | 0; fci < (egrd.fcend | 0); fci++)
        if (g_at(egrd.fakecorr[fci].fx | 0, egrd.fakecorr[fci].fy | 0)) {
            m = egrd.fakecorr[fci].fx | 0;
            n = egrd.fakecorr[fci].fy | 0;
            goldincorridor = true;
            break;
        }
    if (goldincorridor && !egrd.gddone) {
        /* C vault.c:1057-1063 — gd_pick_corridor_gold(grd, m, n). */
        await gd_pick_corridor_gold(grd, m, n);
        if (!grd.mpeaceful)
            return -1;
        egrd.warncnt = 5;
        return 0;
    }
    if (um_dist(grd.mx | 0, grd.my | 0, 1) || egrd.gddone) {
        if (!egrd.gddone && !rn2(10) && !Deaf() && !u.uswallow
            && !(u.ustuck && !sticks(game.youmonst?.data))) {
            SetVoice(grd, 0, 80, 0);
            await verbalize("Move along!");
        }
        await restfakecorr(grd);
        return 0; /* didn't move */
    }
    x = grd.mx | 0;
    y = grd.my | 0;

    /* C's `goto nextpos` / `goto newpos` / `goto proceed` are modelled as a
     * two-label state machine; the flow is otherwise line-for-line. */
    let label = 'nextpos';
    if (!u_in_vault) {
        /* look around (hor & vert only) for accessible places */
        let found = false;
        outer:
        for (nx = x - 1; nx <= x + 1; nx++)
            for (ny = y - 1; ny <= y + 1; ny++) {
                if ((nx === x || ny === y) && (nx !== x || ny !== y)
                    && isok(nx, ny)) {
                    crm = game.level.at(nx, ny);
                    typ = crm.typ;
                    if (!IS_STWALL(typ) && !IS_POOL(typ)) {
                        if (in_fcorridor(grd, nx, ny))
                            continue; /* C: goto nextnxy */

                        if (in_rooms(nx, ny, VAULT)?.length)
                            continue;

                        /* seems we found a good place to leave him alone */
                        egrd.gddone = 1;
                        if (ACCESSIBLE(typ)) {
                            label = 'newpos';
                            found = true;
                            break outer;
                        }
                        crm.typ = (typ === SCORR) ? CORR : DOOR;
                        if (crm.typ === DOOR)
                            crm.doormask = D_NODOOR;
                        else
                            crm.flags = 0;
                        del_engr_at(nx, ny);
                        label = 'proceed';
                        found = true;
                        break outer;
                    }
                }
            }
        if (!found)
            label = 'nextpos';
    }

    /* C: nextpos: ... proceed: ... newpos: — run the remaining blocks in C's
     * order, skipping the ones the label jumped over. */
    for (;;) {
        if (label === 'nextpos') {
            nx = x;
            ny = y;
            ggx = egrd.gdx | 0;
            ggy = egrd.gdy | 0;
            dx = (ggx > x) ? 1 : (ggx < x) ? -1 : 0;
            dy = (ggy > y) ? 1 : (ggy < y) ? -1 : 0;
            if (Math.abs(ggx - x) >= Math.abs(ggy - y))
                nx += dx;
            else
                ny += dy;

            let broke = false;
            crm = game.level.at(nx, ny);
            while ((typ = (crm = game.level.at(nx, ny)).typ) !== STONE) {
                ex = nx + nx - x;
                ey = ny + ny - y;
                /* in view of the above we must have IS_WALL(typ) or typ == POOL */
                if (isok(ex, ey) && IS_ROOM(game.level.at(ex, ey).typ)) {
                    crm.typ = DOOR;
                    crm.doormask = D_NODOOR;
                    del_engr_at(ex, ey);
                    broke = true;
                    label = 'proceed';
                    break;
                }
                if (dy && nx !== x) {
                    nx = x;
                    ny = y + dy;
                    continue;
                }
                if (dx && ny !== y) {
                    ny = y;
                    nx = x + dx;
                    dy = 0;
                    continue;
                }
                /* I don't like this, but ... */
                if (IS_ROOM(typ)) {
                    crm.typ = DOOR;
                    crm.doormask = D_NODOOR;
                    del_engr_at(ex, ey);
                    broke = true;
                    label = 'proceed';
                    break;
                }
                break;
            }
            if (!broke) {
                crm.typ = CORR;
                crm.flags = 0;
                label = 'proceed';
            }
        }

        if (label === 'proceed') {
            newspot = true;
            unblock_point(nx, ny); /* doesn't block light */
            if (cansee(nx, ny))
                newsym(nx, ny);

            if ((nx !== ggx || ny !== ggy)
                || ((grd.mx | 0) !== ggx || (grd.my | 0) !== ggy)) {
                const fcp = egrd.fakecorr[egrd.fcend | 0];
                egrd.fcend = (egrd.fcend | 0) + 1;
                fcp.fx = nx;
                fcp.fy = ny;
                fcp.ftyp = typ;
                fcp.flags = crm.flags;
            } else if (!egrd.gddone) {
                /* We're stuck, so try to find a new destination.
                 * C passes &egrd->gdx / &egrd->gdy as the out-parameters, so a
                 * successful call writes them in place and the second half of
                 * the condition then compares the NEW goal with the old one. */
                const rc = { x: egrd.gdx | 0, y: egrd.gdy | 0 };
                const ok = find_guard_dest(grd, rc);
                if (ok) {
                    egrd.gdx = rc.x;
                    egrd.gdy = rc.y;
                }
                if (!ok || ((egrd.gdx | 0) === ggx && (egrd.gdy | 0) === ggy)) {
                    pline(Monnam(grd) + ", confused, disappears.");
                    return await gd_move_cleanup(grd, semi_dead, true);
                } else {
                    label = 'nextpos';
                    continue;
                }
            }
            label = 'newpos';
        }
        break;
    }

    /* newpos: */
    await gd_mv_monaway(grd, nx, ny);
    if (egrd.gddone)
        return await gd_move_cleanup(grd, semi_dead, false);
    egrd.ogx = grd.mx | 0; /* update old positions */
    egrd.ogy = grd.my | 0;
    remove_monster(grd.mx | 0, grd.my | 0);
    place_monster(grd, nx, ny);
    if (newspot && g_at(nx, ny)) {
        /* C vault.c:1194-1197 — mpickgold() + "picks up some gold." */
        await mpickgold(grd);
        if (canspotmon(grd))
            pline(`${Monnam(grd)} picks up some gold.`);
    } else {
        newsym(grd.mx | 0, grd.my | 0);
    }
    await restfakecorr(grd);
    return 1;
}
