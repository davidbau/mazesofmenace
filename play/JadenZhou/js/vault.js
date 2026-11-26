// vault.js — vault guards.
// C ref: vault.c — clear_fcorr(), blackout(), restfakecorr(), parkguard(),
// in_fcorridor(), findgd(), vault_occupied(), find_guard_dest(), invault(),
// move_gold(), wallify_vault(), gd_mv_monaway(), gd_pick_corridor_gold(),
// gd_move_cleanup(), gd_letknow(), gd_move().
//
// Not ported yet: grddead() (mongone()/mondead() of a guard),
// paygd() (end.js), vault_summon_gd(), vault_gd_watching().

import { an } from './objnam.js';
import { You_see, verbalize, You_hear } from './display.js';
import { simpleonames } from './iactions.js';
import { fracture_rock } from './zap.js';
import { DEADMONSTER } from './mon.js';
import { impossible } from './hack.js';
import { remove_monster } from './muse.js';
import { um_dist } from './shk.js';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    pline, You, pline_The, newsym, canspotmon, map_invisible, mon_visible,
    xy_set_wall_state, map_location
} from './display.js';
import { cansee, couldsee, unblock_point, block_point,
         recalc_block_point } from './vision.js';
import { isok, ROOM, CORR, STONE, SCORR, DOOR, HWALL, VWALL, TLCORNER,
         TRCORNER, BLCORNER, BRCORNER, ROOMOFFSET, VAULT, COLNO, ROWNO,
         D_NODOOR, IS_WALL, IS_STWALL, IS_OBSTRUCTED, IS_POOL, IS_ROOM,
         ACCESSIBLE, MM_EGD, MM_NOMSG, RLOC_MSG, RLOC_ERR, RLOC_NOMSG,
         A_LAWFUL, DEAF, STRANGLED, FCSIZ, SV0, SV1, SV2, SV3,
         SV4, SV5, SV6, SV7, IN_SIGHT, COULD_SEE, M_AP_OBJECT,
         GD_EATGOLD } from './const.js';
import { mons, PM_GUARD, PM_CROESUS } from './monsters.js';
import { GOLD_PIECE, ROCK, BOULDER, TIN_WHISTLE, objects } from './objects.js';
import { makemon, set_malign, place_monster, sobj_at, m_at } from './makemon.js';
import { rloc, mnexto, enexto } from './teleport.js';
import { mongone, setmangry } from './mon.js';
import { yelp } from './sounds.js';
import { deltrap, t_at } from './trap.js';
import { del_engr_at } from './engrave.js';
import { obj_extract_self, place_object, add_to_minv } from './mkobj.js';
import { obfree, stackobj } from './invent.js';
import { in_rooms, nomul } from './hack.js';
import { money_cnt } from './u_init.js';
import { hidden_gold } from './insight.js';
import { adjalign } from './attrib.js';
import { stop_occupation, unmul } from './allmain.js';
import { tty_getlin } from './wintty.js';
import { mungspaces, upstart, distu, dist2 } from './hacklib.js';
import { Monnam, noit_Monnam, Some_Monnam, x_monnam, pmname, Mgender,
         noit_mon_nam, ARTICLE_A } from './do_name.js';
import { sticks } from './engrave.js';
import { makeplural } from './objnam.js';
import { mon_wield_item } from './weapon.js';
import { is_fainted } from './eat.js';
import { mon_track_clear } from './monmove.js';
import { on_level } from './dungeon.js';
import { Deaf, Strangled, Blind } from './youprop.js';
import { u_at } from './const.js';
import { noit_mhis } from './mhitu.js';
import { m_carrying } from './mthrowu.js';

/* C ref: invent.c g_at() */
export function g_at(x, y) {
    for (const o of game.level.objects || [])
        if (o.otyp === GOLD_PIECE && o.ox === x && o.oy === y)
            return o;
    return null;
}
/* C ref: you.h mhe(), noit_mhis() for a guard (always male or female,
   never "it") */
/* C ref: rm.h levl[x][y].flags -- the fields that share C's 'flags' bits */
function lev_flags(lev) {
    return { doormask: lev.doormask, wall_info: lev.wall_info };
}
function set_lev_flags(lev, flags) {
    lev.doormask = flags ? flags.doormask : 0;
    lev.wall_info = flags ? flags.wall_info : 0;
}
/* C ref: display.c unset_seenv() -- vision.c seenv_matrix[][] */
const seenv_matrix = [[SV2, SV1, SV0], [SV3, 0xFF, SV7], [SV4, SV5, SV6]];
function unset_seenv(lev, x0, y0, x, y) {
    const dx = x - x0, dy = y0 - y;
    lev.seenv = (lev.seenv || 0) & ~seenv_matrix[Math.sign(dy) + 1][Math.sign(dx) + 1];
}
/* C ref: timeout.c spot_stop_timers(x, y, MELT_ICE_AWAY) -- see nhlua.js */
function spot_stop_melt_timers(x, y) {
    const lev = game.level.at(x, y);
    if (lev.timer && lev.timer.action === 'MELT_ICE_AWAY')
        lev.timer = null;
}
/* C ref: mon.c m_into_limbo() */
function m_into_limbo(/*mtmp*/) {
    throw new Error('vault: m_into_limbo() not ported yet');
}
// C ref: mon.c mpickgold()
function mpickgold(mtmp) {
    let gold;

    if ((gold = g_at(mtmp.mx, mtmp.my)) !== null) {
        const mat_idx = objects[gold.otyp].oc_material;
        obj_extract_self(gold);
        add_to_minv(mtmp, gold);
        if (cansee(mtmp.mx, mtmp.my)) {
            if (game.flags.verbose && !mtmp.isgd)
                throw new Error('mpickgold(): non-guard message not ported yet');
            void mat_idx;
            newsym(mtmp.mx, mtmp.my);
        }
    }
}

// C ref: vault.c clear_fcorr()
/* try to remove the temporary corridor (from vault to rest of map) being
   maintained by guard 'grd'; if guard is still in it, removal will fail,
   to be tried again later */
async function clear_fcorr(grd, forceshow) {
    const u = game.u;
    let fcx, fcy, fcbeg;
    let mtmp;
    let sawcorridor = false;
    const silently = !!game.program_state?.stopprint;
    const egrd = grd.egd;
    let trap;
    let lev;

    if (!on_level(egrd.gdlevel, u.uz))
        return true;

    /* note: guard remains on 'fmon' list (alive or dead, at off-map
       coordinate <0,0>), until temporary corridor from vault back to
       civilization has been removed */
    while ((fcbeg = egrd.fcbeg) < egrd.fcend) {
        fcx = egrd.fakecorr[fcbeg].fx;
        fcy = egrd.fakecorr[fcbeg].fy;
        if ((DEADMONSTER(grd) || !in_fcorridor(grd, u.ux, u.uy))
            && egrd.gddone)
            forceshow = true;
        if ((u_at(fcx, fcy) && !DEADMONSTER(grd))
            || (!forceshow && couldsee(fcx, fcy))
            || (game.uball && !game.uball.owornmask /* !carried(uball) */
                && game.uball.where === 'OBJ_FLOOR'
                && game.uball.ox === fcx && game.uball.oy === fcy))
            return false;

        if ((mtmp = m_at(fcx, fcy)) !== null) {
            if (mtmp.isgd) {
                return false;
            } else {
                if (mtmp.mtame)
                    await yelp(mtmp);
                if (!(await rloc(mtmp, RLOC_MSG)))
                    m_into_limbo(mtmp);
            }
        }
        lev = game.level.at(fcx, fcy);
        if (lev.typ === CORR && cansee(fcx, fcy))
            sawcorridor = true;
        lev.typ = egrd.fakecorr[fcbeg].ftyp;
        set_lev_flags(lev, egrd.fakecorr[fcbeg].flags);
        if (IS_STWALL(lev.typ)) {
            /* destroy any trap here (pit dug by you, hole dug via
               wand while levitating or by monster, bear trap or land
               mine via object, spun web) when spot reverts to stone */
            if ((trap = t_at(fcx, fcy)) !== null)
                deltrap(trap);
            /* undo scroll/wand/spell of light affecting this spot */
            if (lev.typ === STONE)
                blackout(fcx, fcy);
        }
        del_engr_at(fcx, fcy);
        map_location(fcx, fcy, true); /* bypass vision */
        recalc_block_point(fcx, fcy);
        game.vision_full_recalc = 1;
        egrd.fcbeg++;
    }
    if (sawcorridor && !silently)
        await pline_The("corridor disappears.");
    /* only give encased message if hero is still alive (might get here
       via paygd() -> mongone() -> grddead() when game is over;
       died: no message, quit: message) */
    if (IS_OBSTRUCTED(game.level.at(u.ux, u.uy).typ)
        && ((u.umonnum !== u.umonster) ? u.mh : u.uhp) > 0
        && !silently)
        await You("are encased in rock.");
    return true;
}

// C ref: vault.c blackout()
/* as a temporary corridor is removed, set stone locations and adjacent
   spots to unlit; if player used scroll/wand/spell of light while inside
   the corridor, we don't want the light to reappear if/when a new tunnel
   goes through the same area */
function blackout(x, y) {
    let lev;
    let i, j;

    for (i = x - 1; i <= x + 1; ++i)
        for (j = y - 1; j <= y + 1; ++j) {
            if (!isok(i, j))
                continue;
            lev = game.level.at(i, j);
            /* [possible bug: when (i != x || j != y), perhaps we ought
               to check whether the spot on the far side is lit instead
               of doing a blanket blackout of adjacent locations] */
            if (lev.typ === STONE)
                lev.lit = lev.waslit = 0;
            /* mark <i,j> as not having been seen from <x,y> */
            unset_seenv(lev, x, y, i, j);
        }
}

// C ref: vault.c restfakecorr()
async function restfakecorr(grd) {
    /* it seems you left the corridor - let the guard disappear */
    if (await clear_fcorr(grd, false)) {
        grd.isgd = 0; /* dmonsfree() should delete this mon */
        mongone(grd);
    }
}

// C ref: vault.c parkguard()
/* move guard--dead to alive--to <0,0> until temporary corridor is removed */
function parkguard(grd) {
    /* either guard is dead or will now be treated as if so;
       monster traversal loops should skip it */
    if (game.context.polearm && grd === game.context.polearm.hitmon)
        game.context.polearm.hitmon = null;
    if (grd.mx) {
        remove_monster(grd);
        newsym(grd.mx, grd.my);
    }
    if (m_at(0, 0) !== grd)
        place_monster(grd, 0, 0);
    /* [grd->mx,my just got set to 0,0 by place_monster(), so this
       just sets EGD(grd)->ogx,ogy to 0,0 too; is that what we want?] */
    grd.egd.ogx = grd.mx;
    grd.egd.ogy = grd.my;
}

// C ref: vault.c in_fcorridor()
function in_fcorridor(grd, x, y) {
    let fci;
    const egrd = grd.egd;

    for (fci = egrd.fcbeg; fci < egrd.fcend; fci++)
        if (x === egrd.fakecorr[fci].fx && y === egrd.fakecorr[fci].fy)
            return true;
    return false;
}

// C ref: vault.c findgd()
export function findgd() {
    let mtmp;

    /* this might find a guard parked at <0,0> since it'll be on fmon list */
    for (mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.isgd && mtmp.egd && on_level(mtmp.egd.gdlevel, game.u.uz)) {
            if (!mtmp.mx && !mtmp.egd.gddone)
                mtmp.mhp = mtmp.mhpmax;
            return mtmp;
        }
    }
    /* if not on fmon, look for a guard waiting to migrate to this level */
    for (mtmp = game.migrating_mons; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.isgd && mtmp.egd && on_level(mtmp.egd.gdlevel, game.u.uz))
            throw new Error('findgd(): a guard migrating to this level not ported yet');
    }
    void mon_track_clear;
    return null;
}

// C ref: vault.c vault_occupied()
export function vault_occupied(array) {
    for (const ch of array || '') {
        const r = ch.charCodeAt(0);
        if (game.level.rooms[r - ROOMOFFSET].rtype === VAULT)
            return r;
    }
    return 0;
}

// C ref: vault.c uleftvault()
/* hero has teleported out of vault while a guard is active */
export async function uleftvault(grd) {
    const u = game.u;

    /* only called if caller has checked vault_occupied() and findgd() */
    if (!grd || !grd.isgd || DEADMONSTER(grd)) {
        impossible("escaping vault without guard?");
        return;
    }
    /* if carrying gold and arriving anywhere other than next to the guard,
       set the guard loose */
    if ((money_cnt(game.invent) || hidden_gold(true))
        && um_dist(grd.mx, grd.my, 1)) {
        if (grd.mpeaceful) {
            if (canspotmon(grd)) /* see or sense via telepathy */
                await pline(`${Monnam(grd)} becomes irate.`);
            grd.mpeaceful = 0; /* bypass setmangry() */
        }
        /* if arriving outside guard's temporary corridor, give the
           guard an extra move to deliver message(s) and to teleport
           out of and remove that corridor */
        if (!in_fcorridor(grd, u.ux, u.uy))
            /* (void) */ await gd_move(grd);
    }
}

// C ref: vault.c find_guard_dest()
/* returns { x, y } or null (C: TRUE with *rx,*ry set, or FALSE) */
async function find_guard_dest(guard) {
    const u = game.u;
    let x, y, dd, lx, ly;
    const levl = (xx, yy) => game.level.at(xx, yy);

    for (dd = 2; (dd < ROWNO || dd < COLNO); dd++) {
        incr_radius: {
            for (y = u.uy - dd; y <= u.uy + dd; y++) {
                if (y < 0 || y > ROWNO - 1)
                    continue;
                for (x = u.ux - dd; x <= u.ux + dd; x++) {
                    if (y !== u.uy - dd && y !== u.uy + dd && x !== u.ux - dd)
                        x = u.ux + dd;
                    if (x < 1 || x > COLNO - 1)
                        continue;
                    if (guard && ((x === guard.mx && y === guard.my)
                                  || (guard.isgd && in_fcorridor(guard, x, y))))
                        continue;
                    if (levl(x, y).typ === CORR) {
                        lx = (x < u.ux) ? x + 1 : (x > u.ux) ? x - 1 : x;
                        ly = (y < u.uy) ? y + 1 : (y > u.uy) ? y - 1 : y;
                        if (levl(lx, ly).typ !== STONE && levl(lx, ly).typ !== CORR)
                            break incr_radius;
                        return { x, y };
                    }
                }
            }
        }
    }
    impossible("Not a single corridor on this level?");
    throw new Error('find_guard_dest(): tele() when there is no corridor not ported yet');
}

// C ref: vault.c invault()
export async function invault() {
    const g = game, u = g.u;
    let guard;
    let otmp;
    let spotted;
    let trycount, vaultroom = vault_occupied(u.urooms);
    let vgdeathcount;

    if (!vaultroom) {
        u.uinvault = 0;
        return;
    }
    /* after a couple of guards don't come back from their trips to
       the vault, future guards become more reluctant to turn up (even
       if summoned via whistle) */
    vgdeathcount = g.mvitals[PM_GUARD].died;
    if (vgdeathcount < 2
        || (vgdeathcount < 50 && !rn2(vgdeathcount * vgdeathcount)))
        ++u.uinvault;
    if (u.uinvault < 30 /* VAULT_GUARD_TIME */
        || (u.uinvault % (30 / 2)) !== 0)
        return;

    guard = findgd();
    if (!guard) {
        /* if time ok and no guard now. */
        let buf;
        let x, y, gdx, gdy, typ;
        let umoney;
        const levl = (xx, yy) => g.level.at(xx, yy);

        /* first find the goal for the guard */
        const dest = await find_guard_dest(null);
        if (!dest)
            return;
        gdx = dest.x, gdy = dest.y;
        vaultroom -= ROOMOFFSET;

        /* next find a good place for a door in the wall */
        x = u.ux;
        y = u.uy;
        if (levl(x, y).typ !== ROOM) { /* player dug a door and is in it */
            if (levl(x + 1, y).typ === ROOM) {
                x = x + 1;
            } else if (levl(x, y + 1).typ === ROOM) {
                y = y + 1;
            } else if (levl(x - 1, y).typ === ROOM) {
                x = x - 1;
            } else if (levl(x, y - 1).typ === ROOM) {
                y = y - 1;
            } else if (levl(x + 1, y + 1).typ === ROOM) {
                x = x + 1;
                y = y + 1;
            } else if (levl(x - 1, y - 1).typ === ROOM) {
                x = x - 1;
                y = y - 1;
            } else if (levl(x + 1, y - 1).typ === ROOM) {
                x = x + 1;
                y = y - 1;
            } else if (levl(x - 1, y + 1).typ === ROOM) {
                x = x - 1;
                y = y + 1;
            }
        }
        while (levl(x, y).typ === ROOM) {
            const dx = (gdx > x) ? 1 : (gdx < x) ? -1 : 0;
            const dy = (gdy > y) ? 1 : (gdy < y) ? -1 : 0;
            if (Math.abs(gdx - x) >= Math.abs(gdy - y))
                x += dx;
            else
                y += dy;
        }
        if (u_at(x, y)) {
            if (levl(x + 1, y).typ === HWALL || levl(x + 1, y).typ === DOOR)
                x = x + 1;
            else if (levl(x - 1, y).typ === HWALL
                     || levl(x - 1, y).typ === DOOR)
                x = x - 1;
            else if (levl(x, y + 1).typ === VWALL
                     || levl(x, y + 1).typ === DOOR)
                y = y + 1;
            else if (levl(x, y - 1).typ === VWALL
                     || levl(x, y - 1).typ === DOOR)
                y = y - 1;
            else
                return;
        }

        /* make something interesting happen */
        if (!(guard = makemon(mons[PM_GUARD], x, y, MM_EGD | MM_NOMSG)))
            return;
        guard.isgd = 1;
        guard.mpeaceful = 1;
        set_malign(guard);
        const egd = guard.egd;
        egd.gddone = 0;
        egd.ogx = x;
        egd.ogy = y;
        egd.gdlevel = { dnum: u.uz.dnum, dlevel: u.uz.dlevel }; /* assign_level() */
        egd.vroom = vaultroom;
        egd.warncnt = 0;
        egd.witness = 0;
        egd.dropgoldcnt = 0;
        egd.fcbeg = egd.fcend = 0;
        egd.fakecorr = [];
        for (let i = 0; i < FCSIZ; i++)
            egd.fakecorr.push({ fx: 0, fy: 0, ftyp: 0, flags: null });

        /* ensure the guard doesn't respawn again next turn if killed
           immediately */
        ++u.uinvault;

        /* reset_faint(): if fainted - wake up */
        if (is_fainted())
            throw new Error('invault(): reset_faint() not ported yet');
        /* if there are any boulders in the guard's way, destroy them;
           perhaps the guard knows a touch equivalent of force bolt;
           otherwise the hero wouldn't be able to push one to follow the
           guard out of the vault because that guard would be in its way */
        if ((otmp = sobj_at(BOULDER, guard.mx, guard.my)) !== null) {
            const bname = simpleonames(otmp);
            let bcnt = 0;

            do {
                ++bcnt;
                await fracture_rock(otmp);
                otmp = sobj_at(BOULDER, guard.mx, guard.my);
            } while (otmp);
            /* You_hear() will handle Deaf/!Deaf */
            const func = !Blind() ? You_see : You_hear;
            await func(`${(bcnt === 1) ? an(bname) : makeplural(bname)} shatter.`);
        }
        spotted = canspotmon(guard);
        if (spotted) {
            await pline(`Suddenly one of the Vault's ${
                makeplural(pmname(guard.data, Mgender(guard)))} enters!`);
            newsym(guard.mx, guard.my);
        } else {
            await pline("Someone else has entered the Vault.");
            /* make sure that hero who can't see the guard knows where the
               wall is breeched, otherwise we couldn't follow the guard out;
               the breech isn't necessarily adjacent to the hero */
            map_invisible(guard.mx, guard.my);
        }

        if (u.uswallow) {
            /* can't interrogate hero, don't interrogate engulfer */
            if (!Deaf()) {
                /* SetVoice(guard, 0, 80, 0) */
                await verbalize("What's going on here?");
            }
            if (!spotted)
                await pline_The("other presence vanishes.");
            mongone(guard);
            return;
        }
        const U_AP_TYPE = (u.umonnum !== u.umonster) ? (g.youmonst.m_ap_type || 0) : 0;
        if (U_AP_TYPE === M_AP_OBJECT || u.uundetected)
            throw new Error('invault(): hero mimicking or hiding not ported yet');
        if (Strangled() || (g.youmonst.data.msound === 0 /* is_silent() */)
            || g.multi < 0) {
            /* [we ought to record whether this message has already
               been given in order to vary it upon repeat visits, but
               discarding the monster and its egd data renders that hard] */
            if (Deaf()) {
                await pline(`${noit_Monnam(guard)} huffs and turns to leave.`);
            } else {
                /* SetVoice(guard, 0, 80, 0) */
                await verbalize("I'll be back when you're ready to speak to me!");
            }
            mongone(guard);
            return;
        }

        await stop_occupation(); /* if occupied, stop it *now* */
        if (g.multi > 0) {
            nomul(0);
            await unmul(null);
        }
        buf = '';
        trycount = 5;
        do {
            buf = (await tty_getlin(Deaf() ? "You are required to supply your name. -"
                                           : "\"Hello stranger, who are you?\" -")) || '';
            buf = mungspaces(buf);
        } while (!buf[0] && --trycount > 0);

        if (u.ualign.type === A_LAWFUL
            /* ignore trailing text, in case player includes rank */
            && buf.slice(0, g.plname.length).toLowerCase()
               !== g.plname.toLowerCase()) {
            adjalign(-1); /* Liar! */
        }

        const lbuf = buf.toLowerCase();
        if (lbuf === "croesus" || lbuf === "kroisos"
            || lbuf === "creosote") { /* Discworld */
            if (!g.mvitals[PM_CROESUS].died) {
                if (Deaf()) {
                    if (!Blind())
                        await pline(`${noit_Monnam(guard)} waves goodbye.`);
                } else {
                    /* SetVoice(guard, 0, 80, 0) */
                    await verbalize(
                         "Oh, yes, of course.  Sorry to have disturbed you.");
                }
                mongone(guard);
            } else {
                await setmangry(guard, false);
                if (Deaf()) {
                    if (!Blind())
                        await pline(`${noit_Monnam(guard)} mouths something and looks very angry!`);
                } else {
                    /* SetVoice(guard, 0, 80, 0) */
                    await verbalize(
                           "Back from the dead, are you?  I'll remedy that!");
                }
                /* don't want guard to waste next turn wielding a weapon */
                if (!guard.mw) { /* MON_WEP() */
                    guard.weapon_check = 2; /* NEED_HTH_WEAPON */
                    await mon_wield_item(guard);
                }
            }
            return;
        }
        if (Deaf()) {
            await pline(`${noit_Monnam(guard)} doesn't ${
                Blind() ? "" : "appear to "}recognize you.`);
        } else {
            /* SetVoice(guard, 0, 80, 0) */
            await verbalize("I don't know you.");
        }
        umoney = money_cnt(g.invent);
        if (!umoney && !hidden_gold(true)) {
            if (Deaf()) {
                await pline(`${noit_Monnam(guard)} stomps${Blind() ? "" : " and beckons"}.`);
            } else {
                /* SetVoice(guard, 0, 80, 0) */
                await verbalize("Please follow me.");
            }
        } else {
            if (!umoney) {
                if (Deaf()) {
                    if (!Blind())
                        await pline(`${noit_Monnam(guard)} glares at you${
                            g.invent ? "r stuff" : ""}.`);
                } else {
                    /* SetVoice(guard, 0, 80, 0) */
                    await verbalize("You have hidden gold.");
                }
            }
            if (Deaf()) {
                if (!Blind())
                    await pline(`${noit_Monnam(guard)} holds out ${noit_mhis(guard)
                        } palm and beckons with ${noit_mhis(guard)} other hand.`);
            } else {
                /* SetVoice(guard, 0, 80, 0) */
                await verbalize(
                    "Most likely all your gold was stolen from this vault.");
                /* SetVoice(guard, 0, 80, 0) */
                await verbalize("Please drop that gold and follow me.");
            }
            egd.dropgoldcnt++;
        }
        egd.gdx = gdx;
        egd.gdy = gdy;
        egd.fcbeg = 0;
        egd.fakecorr[0].fx = x;
        egd.fakecorr[0].fy = y;
        typ = levl(x, y).typ;
        if (!IS_WALL(typ)) {
            /* guard arriving at non-wall implies a door; vault wall was
               dug into an empty doorway (which could subsequently have
               been plugged with an intact door by use of locking magic) */
            const vlt = egd.vroom;
            const room = g.level.rooms[vlt];
            const lowx = room.lx, hix = room.hx;
            const lowy = room.ly, hiy = room.hy;

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
            levl(x, y).typ = typ; /* wall; will be changed to door below */
            levl(x, y).wall_info = 0; /* will be reset too via doormask */
            levl(x, y).doormask = 0;
            xy_set_wall_state(x, y); /* set WA_MASK bits in .wall_info */
        }
        egd.fakecorr[0].ftyp = typ;
        egd.fakecorr[0].flags = lev_flags(levl(x, y));
        /* guard's entry point where confrontation with hero takes place */
        spot_stop_melt_timers(x, y);
        levl(x, y).typ = DOOR;
        levl(x, y).doormask = D_NODOOR;
        unblock_point(x, y); /* empty doorway doesn't block light */
        egd.fcend = 1;
        egd.warncnt = 1;
    }
}

// C ref: vault.c move_gold()
function move_gold(gold, vroom) {
    let nx, ny;
    const room = game.level.rooms[vroom];

    obj_extract_self(gold); /* remove_object() */
    newsym(gold.ox, gold.oy);
    nx = room.lx + rn2(2);
    ny = room.ly + rn2(2);
    place_object(gold, nx, ny);
    stackobj(gold);
    newsym(nx, ny);
}

// C ref: vault.c wallify_vault()
async function wallify_vault(grd) {
    let typ;
    let x, y;
    const vlt = grd.egd.vroom;
    let tmp_viz;
    const room = game.level.rooms[vlt];
    const lox = room.lx - 1, hix = room.hx + 1,
        loy = room.ly - 1, hiy = room.hy + 1;
    let mon;
    let gold, rocks;
    let trap;
    let fixed = false;
    let movedgold = false;
    const levl = (xx, yy) => game.level.at(xx, yy);

    for (x = lox; x <= hix; x++)
        for (y = loy; y <= hiy; y++) {
            /* if not on the room boundary, skip ahead */
            if (x !== lox && x !== hix && y !== loy && y !== hiy)
                continue;

            if ((!IS_WALL(levl(x, y).typ) || g_at(x, y)
                 || sobj_at(ROCK, x, y) || sobj_at(BOULDER, x, y))
                && !in_fcorridor(grd, x, y)) {
                if ((mon = m_at(x, y)) !== null && mon !== grd) {
                    if (mon.mtame)
                        await yelp(mon);
                    if (!(await rloc(mon, RLOC_MSG)))
                        m_into_limbo(mon);
                }
                /* move gold at wall locations into the vault */
                if ((gold = g_at(x, y)) !== null) {
                    move_gold(gold, grd.egd.vroom);
                    movedgold = true;
                }
                /* destroy rocks and boulders (subsume them into the walls);
                   other objects present stay intact and become embedded */
                while ((rocks = sobj_at(ROCK, x, y)) !== null) {
                    obj_extract_self(rocks);
                    obfree(rocks, null);
                }
                while ((rocks = sobj_at(BOULDER, x, y)) !== null) {
                    obj_extract_self(rocks);
                    obfree(rocks, null);
                }
                if ((trap = t_at(x, y)) !== null)
                    deltrap(trap);

                if (x === lox)
                    typ = (y === loy) ? TLCORNER
                          : (y === hiy) ? BLCORNER
                            : VWALL;
                else if (x === hix)
                    typ = (y === loy) ? TRCORNER
                          : (y === hiy) ? BRCORNER
                            : VWALL;
                else /* not left or right side, must be top or bottom */
                    typ = HWALL;

                levl(x, y).typ = typ;
                levl(x, y).wall_info = 0;
                levl(x, y).doormask = 0;
                xy_set_wall_state(x, y); /* set WA_MASK bits in .wall_info */
                del_engr_at(x, y);
                /*
                 * hack: player knows walls are restored because of the
                 * message, below, so show this on the screen.
                 */
                tmp_viz = game.viz_array[y][x];
                game.viz_array[y][x] = IN_SIGHT | COULD_SEE;
                newsym(x, y);
                game.viz_array[y][x] = tmp_viz;
                block_point(x, y);
                fixed = true;
            }
        }

    if (movedgold || fixed) {
        if (in_fcorridor(grd, grd.mx, grd.my) || cansee(grd.mx, grd.my))
            await pline(`${noit_Monnam(grd)} whispers an incantation.`);
        else
            await You_hear("a distant chant.");
        if (movedgold)
            await pline("A mysterious force moves the gold into the vault.");
        if (fixed)
            await pline_The("damaged vault's walls are magically restored!");
    }
}

// C ref: vault.c gd_mv_monaway()
async function gd_mv_monaway(grd, nx, ny) {
    const mtmp = m_at(nx, ny);

    if (mtmp && mtmp !== grd) {
        if (!Deaf()) {
            /* SetVoice(grd, 0, 80, 0) */
            await verbalize("Out of my way, scum!");
        }
        if (!(await rloc(mtmp, RLOC_ERR | RLOC_MSG)) || m_at(nx, ny))
            m_into_limbo(mtmp);
        recalc_block_point(nx, ny);
    }
}

// C ref: vault.c gd_pick_corridor_gold()
/* have guard pick gold off the floor, possibly moving to the gold's
   position before message and back to his current spot after */
async function gd_pick_corridor_gold(grd, goldx, goldy) {
    let gold;
    const guardx = grd.mx, guardy = grd.my;
    const under_u = u_at(goldx, goldy),
        see_it = cansee(goldx, goldy);

    if (under_u) {
        /* Grab the gold from between the hero's feet.
           If guard is two or more steps away; bring him closer first. */
        gold = g_at(goldx, goldy);
        if (!gold) {
            impossible("vault guard: no gold at hero's feet?");
            return;
        }
        const gdelta = distu(guardx, guardy);
        if (gdelta > 2 && see_it) { /* skip if player won't see it */
            let bestdelta = gdelta;
            let bestcc = { x: guardx, y: guardy };
            let tryct = 9;
            do {
                /* pick an available spot nearest the hero and also try
                   to find the one meeting that criterium which is nearest
                   the guard's current location */
                const newcc = { x: 0, y: 0 };
                if (enexto(newcc, goldx, goldy, grd.data)) {
                    const newdelta = distu(newcc.x, newcc.y);
                    if (newdelta < bestdelta
                        || (newdelta === bestdelta
                            && dist2(newcc.x, newcc.y, guardx, guardy)
                               < dist2(bestcc.x, bestcc.y, guardx, guardy))) {
                        bestdelta = newdelta;
                        bestcc = newcc;
                    }
                }
            } while (--tryct >= 0);

            if (bestdelta < gdelta) {
                remove_monster(grd);
                newsym(guardx, guardy);
                place_monster(grd, bestcc.x, bestcc.y);
                newsym(grd.mx, grd.my);
            }
        }
        obj_extract_self(gold);
        add_to_minv(grd, gold);
        newsym(goldx, goldy);

    /* guard is already at gold's location */
    } else if (goldx === guardx && goldy === guardy) {
        mpickgold(grd); /* does a newsym */

    /* gold is at some third spot, neither guard's nor hero's */
    } else {
        /* just for insurance... */
        await gd_mv_monaway(grd, goldx, goldy); /* make room for guard */
        if (see_it) { /* skip if player won't see the message */
            remove_monster(grd);
            newsym(grd.mx, grd.my);
            place_monster(grd, goldx, goldy); /* sets <grd->mx, grd->my> */
        }
        mpickgold(grd); /* does a newsym */
    }

    if (see_it) { /* cansee(goldx, goldy) */
        await pline(`${Some_Monnam(grd)}${
            (grd.mpeaceful && grd.egd.warncnt > 5) ? " calms down and" : ""
            } picks up the gold${under_u ? " from beneath you" : ""}.`);
    }

    /* if guard was moved to get the gold, move him back */
    if (grd.mx !== guardx || grd.my !== guardy) {
        remove_monster(grd);
        newsym(grd.mx, grd.my);
        place_monster(grd, guardx, guardy);
        newsym(guardx, guardy);
    }
}

// C ref: vault.c gd_move_cleanup()
/* return 1: guard moved, -2: died  */
async function gd_move_cleanup(grd, semi_dead, disappear_msg_seen) {
    /*
     * The following is a kludge.  We need to keep the guard around in
     * order to be able to make the fake corridor disappear as the
     * player moves out of it, but we also need the guard out of the
     * way.  We send the guard to never-never land.  We set ogx ogy to
     * mx my in order to avoid a check at the top of this function.
     * At the end of the process, the guard is killed in restfakecorr().
     */
    const x = grd.mx, y = grd.my;
    const see_guard = canspotmon(grd);
    parkguard(grd); /* move to <0,0> */
    await wallify_vault(grd);
    await restfakecorr(grd);
    if (!semi_dead && (in_fcorridor(grd, game.u.ux, game.u.uy) || cansee(x, y))) {
        if (!disappear_msg_seen && see_guard)
            await pline(`Suddenly, ${noit_mon_nam(grd)} disappears.`);
        return 1;
    }
    return -2;
}

// C ref: vault.c gd_letknow()
async function gd_letknow(grd) {
    if (!cansee(grd.mx, grd.my) || !mon_visible(grd))
        await You_hear(`${m_carrying(grd, TIN_WHISTLE)
                          ? "the shrill sound of a guard's whistle"
                          : "angry shouting"}.`);
    else
        await You(`${um_dist(grd.mx, grd.my, 2) ? "see" : "are confronted by"} ${
            /* "an angry guard" */
            x_monnam(grd, ARTICLE_A, "angry", 0, false)}${
            um_dist(grd.mx, grd.my, 2) ? " approaching" : ""}.`);
}

// C ref: vault.c gd_move()
/*
 * return  1: guard moved,  0: guard didn't,  -1: let m_move do it,  -2: died
 */
export async function gd_move(grd) {
    const u = game.u;
    let x, y, nx, ny, m, n, ex, ey;
    let dx, dy, ggx = 0, ggy = 0, fci;
    let typ;
    let crm;
    let fcp;
    const egrd = grd.egd;
    let umoney = 0;
    let goldincorridor = false, u_in_vault = false, grd_in_vault = false;
    const semi_dead = DEADMONSTER(grd);
    let u_carry_gold = false, newspot = false;
    const levl = (xx, yy) => game.level.at(xx, yy);

    if (!on_level(egrd.gdlevel, u.uz))
        return -1;

    if (semi_dead || !grd.mx || egrd.gddone) {
        egrd.gddone = 1;
        return await gd_move_cleanup(grd, semi_dead, false);
    }

    u_in_vault = vault_occupied(u.urooms) ? true : false;
    grd_in_vault = in_rooms(grd.mx, grd.my, VAULT).length ? true : false;
    if (!u_in_vault && !grd_in_vault)
        await wallify_vault(grd);

    if (!grd.mpeaceful) {
        if (!u_in_vault
            && (grd_in_vault || (in_fcorridor(grd, grd.mx, grd.my)
                                 && !in_fcorridor(grd, u.ux, u.uy)))) {
            await rloc(grd, RLOC_MSG);
            await wallify_vault(grd);
            if (!in_fcorridor(grd, grd.mx, grd.my))
                await clear_fcorr(grd, true);
            await gd_letknow(grd);
            return -1;
        }
        if (!in_fcorridor(grd, grd.mx, grd.my))
            await clear_fcorr(grd, true);
        return -1;
    }
    if (Math.abs(egrd.ogx - grd.mx) > 1 || Math.abs(egrd.ogy - grd.my) > 1)
        return -1; /* teleported guard - treat as monster */

    if (egrd.witness) {
        if (!Deaf()) {
            /* SetVoice(grd, 0, 80, 0) */
            await verbalize(`How dare you ${
                (egrd.witness & GD_EATGOLD) ? "consume" : "destroy"} that gold, scoundrel!`);
        }
        egrd.witness = 0;
        grd.mpeaceful = 0;
        return -1;
    }

    umoney = money_cnt(game.invent);
    u_carry_gold = (umoney > 0 || hidden_gold(true) > 0);
    if (egrd.fcend === 1) {
        if (u_in_vault && (u_carry_gold || um_dist(grd.mx, grd.my, 1))) {
            if (egrd.warncnt === 3 && !Deaf()) {
                const buf = `${u_carry_gold ? (!umoney ? "drop that hidden gold and "
                                                       : "drop that gold and ")
                                            : ""}follow me!`;
                /* SetVoice(grd, 0, 80, 0) */
                if (egrd.dropgoldcnt || !u_carry_gold)
                    await verbalize(`I repeat, ${buf}`);
                else
                    await verbalize(upstart(buf));
                if (u_carry_gold)
                    egrd.dropgoldcnt++;
            }
            if (egrd.warncnt === 7) {
                m = grd.mx;
                n = grd.my;
                if (!Deaf()) {
                    /* SetVoice(grd, 0, 80, 0) */
                    await verbalize("You've been warned, knave!");
                }
                grd.mpeaceful = 0;
                await mnexto(grd, RLOC_NOMSG);
                levl(m, n).typ = egrd.fakecorr[0].ftyp;
                set_lev_flags(levl(m, n), egrd.fakecorr[0].flags);
                recalc_block_point(m, n);
                del_engr_at(m, n);
                newsym(m, n);
                return -1;
            }
            /* not fair to get mad when (s)he's fainted or paralyzed */
            if (!is_fainted() && game.multi >= 0)
                egrd.warncnt++;
            return 0;
        }

        if (!u_in_vault) {
            if (u_carry_gold) { /* player teleported */
                m = grd.mx;
                n = grd.my;
                await rloc(grd, RLOC_MSG);
                levl(m, n).typ = egrd.fakecorr[0].ftyp;
                set_lev_flags(levl(m, n), egrd.fakecorr[0].flags);
                recalc_block_point(m, n); /* guard corridor goes away */
                del_engr_at(m, n);
                newsym(m, n);
                grd.mpeaceful = 0;
                await gd_letknow(grd);
                return -1;
            } else {
                if (!Deaf()) {
                    /* SetVoice(grd, 0, 80, 0) */
                    await verbalize("Well, begone.");
                }
                egrd.gddone = 1;
                return await gd_move_cleanup(grd, semi_dead, false);
            }
        }
    }

    if (egrd.fcend > 1) {
        if (egrd.fcend > 2 && in_fcorridor(grd, grd.mx, grd.my)
            && !egrd.gddone && !in_fcorridor(grd, u.ux, u.uy)
            && (levl(egrd.fakecorr[0].fx, egrd.fakecorr[0].fy).typ
                === egrd.fakecorr[0].ftyp)) {
            await pline(`${noit_Monnam(grd)}, confused, disappears.`);
            return await gd_move_cleanup(grd, semi_dead, true);
        }
        if (u_carry_gold && (in_fcorridor(grd, u.ux, u.uy)
                             /* cover a 'blind' spot */
                             || (egrd.fcend > 1 && u_in_vault))) {
            if (!grd.mx) {
                await restfakecorr(grd);
                return -2;
            }
            if (egrd.warncnt < 6) {
                egrd.warncnt = 6;
                if (Deaf()) {
                    if (!Blind())
                        await pline(`${noit_Monnam(grd)} holds out ${
                            noit_mhis(grd)} palm demandingly!`);
                } else {
                    /* SetVoice(grd, 0, 80, 0) */
                    await verbalize("Drop all your gold, scoundrel!");
                }
                return 0;
            } else {
                if (Deaf()) {
                    if (!Blind())
                        await pline(`${noit_Monnam(grd)} rubs ${
                            noit_mhis(grd)} hands with enraged delight!`);
                } else {
                    /* SetVoice(grd, 0, 80, 0) */
                    await verbalize("So be it, rogue!");
                }
                grd.mpeaceful = 0;
                return -1;
            }
        }
    }
    m = n = 0;
    for (fci = egrd.fcbeg; fci < egrd.fcend; fci++)
        if (g_at(egrd.fakecorr[fci].fx, egrd.fakecorr[fci].fy)) {
            m = egrd.fakecorr[fci].fx;
            n = egrd.fakecorr[fci].fy;
            goldincorridor = true;
            break;
        }
    /* new gold can appear if it was embedded in stone and hero kicks it
       (on even via wish and drop) so don't assume hero has been warned */
    if (goldincorridor && !egrd.gddone) {
        await gd_pick_corridor_gold(grd, m, n);
        if (!grd.mpeaceful)
            return -1;
        egrd.warncnt = 5;
        return 0;
    }
    if (um_dist(grd.mx, grd.my, 1) || egrd.gddone) {
        if (!egrd.gddone && !rn2(10) && !Deaf() && !u.uswallow
            && !(u.ustuck && !sticks(game.youmonst.data))) {
            /* SetVoice(grd, 0, 80, 0) */
            await verbalize("Move along!");
        }
        await restfakecorr(grd);
        return 0; /* didn't move */
    }
    x = grd.mx;
    y = grd.my;

    let state = u_in_vault ? 'nextpos' : 'look';

    if (state === 'look') {
        /* look around (hor & vert only) for accessible places */
        lookaround:
        for (nx = x - 1; nx <= x + 1; nx++)
            for (ny = y - 1; ny <= y + 1; ny++) {
                if ((nx === x || ny === y) && (nx !== x || ny !== y)
                    && isok(nx, ny)) {
                    crm = levl(nx, ny);
                    typ = crm.typ;
                    if (!IS_STWALL(typ) && !IS_POOL(typ)) {
                        if (in_fcorridor(grd, nx, ny))
                            continue; /* goto nextnxy */

                        if (in_rooms(nx, ny, VAULT).length)
                            continue;

                        /* seems we found a good place to leave him alone */
                        egrd.gddone = 1;
                        if (ACCESSIBLE(typ)) {
                            state = 'newpos';
                            break lookaround;
                        }
                        crm.typ = (typ === SCORR) ? CORR : DOOR;
                        if (crm.typ === DOOR)
                            crm.doormask = D_NODOOR;
                        else
                            set_lev_flags(crm, null);
                        del_engr_at(nx, ny);
                        state = 'proceed';
                        break lookaround;
                    }
                }
            }
        if (state === 'look')
            state = 'nextpos';
    }

    for (;;) {
        if (state === 'nextpos') {
            nx = x;
            ny = y;
            ggx = egrd.gdx;
            ggy = egrd.gdy;
            dx = (ggx > x) ? 1 : (ggx < x) ? -1 : 0;
            dy = (ggy > y) ? 1 : (ggy < y) ? -1 : 0;
            if (Math.abs(ggx - x) >= Math.abs(ggy - y))
                nx += dx;
            else
                ny += dy;

            state = 'corr';
            while ((typ = (crm = levl(nx, ny)).typ) !== STONE) {
                ex = nx + nx - x;
                ey = ny + ny - y;
                /* in view of the above we must have IS_WALL(typ) or typ == POOL */
                /* must be a wall here */
                if (isok(ex, ey) && IS_ROOM(levl(ex, ey).typ)) {
                    crm.typ = DOOR;
                    crm.doormask = D_NODOOR;
                    del_engr_at(ex, ey);
                    state = 'proceed';
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
                    state = 'proceed';
                    break;
                }
                break;
            }
            if (state === 'corr') {
                crm.typ = CORR;
                set_lev_flags(crm, null);
                state = 'proceed';
            }
        }
        if (state === 'proceed') {
            newspot = true;
            unblock_point(nx, ny); /* doesn't block light */
            if (cansee(nx, ny))
                newsym(nx, ny);

            if ((nx !== ggx || ny !== ggy) || (grd.mx !== ggx || grd.my !== ggy)) {
                fcp = egrd.fakecorr[egrd.fcend];
                /* fakecorr overflow does not occur because egrd->fakecorr[]
                   is too small, but it has occurred when the same <x,y> are
                   put into it repeatedly for some as yet unexplained reason */
                if (egrd.fcend++ === FCSIZ)
                    throw new Error('panic: fakecorr overflow');
                fcp.fx = nx;
                fcp.fy = ny;
                fcp.ftyp = typ;
                fcp.flags = lev_flags(crm);
            } else if (!egrd.gddone) {
                /* We're stuck, so try to find a new destination. */
                const dest = await find_guard_dest(grd);
                if (dest) {
                    egrd.gdx = dest.x;
                    egrd.gdy = dest.y;
                }
                if (!dest || (egrd.gdx === ggx && egrd.gdy === ggy)) {
                    await pline(`${Monnam(grd)}, confused, disappears.`);
                    return await gd_move_cleanup(grd, semi_dead, true);
                } else {
                    state = 'nextpos';
                    continue;
                }
            }
            state = 'newpos';
        }
        break;
    }
    /* newpos: */
    await gd_mv_monaway(grd, nx, ny);
    if (egrd.gddone)
        return await gd_move_cleanup(grd, semi_dead, false);
    egrd.ogx = grd.mx; /* update old positions */
    egrd.ogy = grd.my;
    remove_monster(grd);
    place_monster(grd, nx, ny);
    if (newspot && g_at(nx, ny)) {
        /* if there's gold already here (most likely from mineralize()),
           pick it up now so that guard doesn't later think hero dropped
           it and give an inappropriate message */
        mpickgold(grd);
        if (canspotmon(grd))
            await pline(`${Monnam(grd)} picks up some gold.`);
    } else
        newsym(grd.mx, grd.my);
    await restfakecorr(grd);
    return 1;
}

