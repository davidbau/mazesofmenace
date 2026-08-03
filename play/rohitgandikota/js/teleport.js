// teleport.js — position finding.
// C ref: src/teleport.c
//
// Only the pieces level generation and pet placement need are here:
// collect_coords() and enexto()/enexto_core().
//
// collect_coords() is a bigger PRNG consumer than it looks. It walks expanding
// square "rings" around a centre and shuffles each ring, drawing rn2(n) once
// per remaining entry — so a full ring of radius 1 costs 7 draws, radius 2
// costs 15, radius 3 costs 23. With CC_NO_FLAGS there is no filtering at all,
// so the counts are pure geometry clamped to the map edges: that is exactly the
// rn2(8) rn2(7) … rn2(2) rn2(16) rn2(15) … run the recordings show when a pet
// is placed.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { COLNO, ROWNO, In_endgame, In_quest, In_sokoban, GP_CHECKSCARY,
         NO_MM_FLAGS } from './const.js';
import { rnl } from './rng.js';
import { pline } from './display.js';
import { You, You_feel, You_cant } from './pline.js';
import { getlin } from './cmd.js';
import { get_level, depth, print_dungeon, dunlevs_in_dungeon } from './dungeon.js';
import { rnd } from './rng.js';
import { Is_knox_level } from './const.js';
import { schedule_goto, UTOTYPE_NONE } from './do.js';
import { t_at } from './mon.js';
import { unconscious } from './trap.js';
import { goodpos } from './makemon.js';
import { newsym } from './display.js';
import { vision_recalc } from './vision.js';
import { spoteffects } from './hack.js';
import { morehungry } from './eat.js';
import { getpos } from './getpos.js';

import { isok, ECMD_OK, ECMD_TIME, VIBRATING_SQUARE, is_pit, is_hole } from './const.js';

// include/hack.h:1204-1210

function note_unported_teleport(what) {
    (game.unported ||= new Set()).add('teleport:' + what);
}

export const CC_NO_FLAGS = 0x00;
export const CC_INCL_CENTER = 0x01;
export const CC_UNSHUFFLED = 0x02;
export const CC_RING_PAIRS = 0x04;
export const CC_SKIP_MONS = 0x08;
export const CC_SKIP_INACCS = 0x10;

// include/hack.h:1170
export const GP_ALLOW_XY = 0x00200000;

// src/teleport.c:578 collect_coords()
//
// Returns an array of {x, y}. `maxradius` of 0 means "cover the whole map".
export function collect_coords(cx, cy, maxradius, cc_flags, filter) {
    const out = [];
    const include_cxcy = (cc_flags & CC_INCL_CENTER) !== 0;
    const scramble = (cc_flags & CC_UNSHUFFLED) === 0;
    const ring_pairs = (scramble && (cc_flags & CC_RING_PAIRS) !== 0);
    const skip_mons = (cc_flags & CC_SKIP_MONS) !== 0;
    const skip_inaccessible = (cc_flags & CC_SKIP_INACCS) !== 0;

    const rowrange = (cy < Math.trunc(ROWNO / 2)) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < Math.trunc(COLNO / 2)) ? (COLNO - 1 - cx) : cx;
    let k = Math.max(rowrange, colrange);
    maxradius = !maxradius ? k : Math.min(maxradius, k);

    /* index in `out` where the current ring (or ring pair) starts, and how
       many entries it has — C tracks these as passcc and n */
    let passStart = 0, n = 0;
    let havePass = false;

    for (let radius = include_cxcy ? 0 : 1; radius <= maxradius; ++radius) {
        let newpass, passend;
        if (!ring_pairs) {
            newpass = passend = true;
        } else {
            newpass = ((radius % 2) !== 0 || radius === 0);
            passend = ((radius % 2) === 0 || radius === maxradius);
        }
        if (newpass || !havePass) {
            passStart = out.length;
            n = 0;
            havePass = true;
        }

        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; ++y) {
            if (y > ROWNO - 1)
                break;                       /* done with this radius */
            for (let x = Math.max(lox, 1); x <= hix; ++x) {
                if (x > COLNO - 1)
                    break;                   /* advance to next y */
                if (x !== lox && x !== hix && y !== loy && y !== hiy)
                    continue;                /* not on the ring's edge */
                if ((skip_mons && m_at(x, y))
                    || (skip_inaccessible && !ZAP_POS(x, y)))
                    continue;
                if (filter && !filter(x, y))
                    continue;
                out.push({ x, y });
                ++n;
            }
        }

        if (scramble && passend) {
            /* selection shuffle over the ring's entries: one rn2 per entry
               still in play, counting down */
            let p = passStart;
            while (n > 1) {
                k = rn2(n);                  /* 0..n-1 */
                if (k) {
                    const tmp = out[p];
                    out[p] = out[p + k];
                    out[p + k] = tmp;
                }
                ++p;
                --n;
            }
        }
    }
    return out;
}

function m_at(x, y) {
    return game.level?.monAt?.get(`${x},${y}`) ?? null;
}

// include/rm.h ZAP_POS() — accepts pools and lava, rejects rock and walls.
function ZAP_POS(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && loc.typ >= 16 /* POOL */;
}

// src/teleport.c:735 enexto_core() — a spot as close to <xx,yy> as feasible.
//
// Two collect_coords() passes: radius 3 first, then the whole map. The second
// pass re-collects and therefore re-shuffles the near rings, so its draw count
// includes them again even though the caller skips those entries.
export function enexto_core(cc, xx, yy, mdat, entflags, goodpos) {
    /* src/teleport.c:234 — a null mdat defaults to the hero's original
       monster type */
    if (!mdat)
        mdat = game.mons[game.u.umonster];
    /* src/teleport.c:118 — C builds a dummy monst and set_mon_data()s the
       permonst into it, because goodpos() takes a monster, not a permonst. */
    const fakemon = { data: mdat, wormno: 0 };
    const allow_xx_yy = (entflags & GP_ALLOW_XY) !== 0;

    const near = collect_coords(xx, yy, 3, CC_NO_FLAGS, null);
    for (const c of near) {
        if (goodpos(c.x, c.y, fakemon, entflags)) {
            cc.x = c.x; cc.y = c.y;
            return true;
        }
    }

    const all = collect_coords(xx, yy, 0, CC_NO_FLAGS, null);
    for (let i = near.length; i < all.length; ++i) {
        if (goodpos(all[i].x, all[i].y, fakemon, entflags)) {
            cc.x = all[i].x; cc.y = all[i].y;
            return true;
        }
    }

    cc.x = xx; cc.y = yy;
    return allow_xx_yy && goodpos(xx, yy, fakemon, entflags);
}

// src/teleport.c:1165 level_tele() — the controlled level teleport.
//
// The whole function is long because most of it handles destinations that
// cannot survive: above the dungeon (heaven, Cloud 9, a fatal plummet), the
// endgame planes, Gehennom before the invocation, and escaping the Quest.
// What the recorded sessions exercise is the wizard-mode path: prompt, read a
// number, convert it, schedule the goto.
//
// Note the loop: C re-prompts up to ten times while the answer is neither a
// number nor a level NAME, and appends a hint to the question from the second
// pass on. That hint changes the prompt text on screen, so the retry count is
// visible, not just internal.
export async function level_tele() {
    let newlev = 0;
    const newlevel = { dnum: 0, dlevel: 0 };
    let force_dest = false;
    let buf = '';
    let random_port = false;    /* C: goto random_levtport */

    if ((game.u.uhave?.amulet || In_endgame(game.u.uz) || In_sokoban(game.u.uz))
        && !game.wizard) {
        await You_feel('very disoriented for a moment.');
        return;
    }

    if ((Teleport_control() && !Stunned()) || game.wizard) {
        let qbuf = 'To what level do you want to teleport?';
        let trycnt = 0;

        do {
            if (++trycnt === 2)
                qbuf += game.wizard ? ' [type a number, name, or ? for a menu]'
                                    : ' [type a number or name]';
            /* EDIT_GETLIN: a previous answer was invalid, so it is NOT
               offered back as the default */
            buf = await getlin(qbuf);

            if (buf === '*') {
                random_port = true;
                break;
            } else if (Confusion() && rnl(5)) {
                await pline('Oops...');
                random_port = true;
                break;
            } else if (buf === '\x1b') {        /* cancelled */
                return;
            }

            if (game.wizard && buf === '?') {
                const dest = { lev: 0, dnum: 0 };

                newlev = await print_dungeon(true, dest);
                if (!newlev)
                    return;

                newlevel.dnum = dest.dnum;
                newlevel.dlevel = dest.lev;
                if (In_endgame(newlevel) && !In_endgame(game.u.uz))
                    note_unported_tele('level_tele:endgame_amulet');
                force_dest = true;
            } else {
                newlev = lev_by_name(buf);
                if (newlev === 0)
                    newlev = parseInt(buf, 10) || 0;   /* atoi() */
            }
        } while (!newlev && !isdigit(buf[0])
                 && (buf[0] !== '-' || !isdigit(buf[1])) && trycnt < 10);

        if (!random_port) {
            if (newlev === 0) {
                /* "Go to Nowhere" and the suicide it performs */
                note_unported_tele('level_tele:Nowhere');
                return;
            }

            if (In_quest(game.u.uz) && newlev > 0)
                newlev = newlev + game.dungeons[game.u.uz.dnum].depth_start - 1;
        }
    } else { /* involuntary level tele */
        random_port = true;
    }

    if (random_port) {
        /* teleport.c:1293 random_levtport: */
        newlev = random_teleport_level();
        if (newlev === depth(game.u.uz)) {
            await You('shudder for a moment.');
            return;
        }
    }

    if (!next_to_u() && !force_dest) {
        await You('shudder for a moment.');
        return;
    }

    if (In_endgame(game.u.uz)) {
        note_unported_tele('level_tele:endgame');
        return;
    }

    if (newlev < 0 && !force_dest) {
        /* heaven, Cloud 9, and the plummet; all of them kill or escape */
        note_unported_tele('level_tele:above the dungeon');
        return;
    }

    if (force_dest) {
        /* wizard mode menu; no further validation needed */
    } else {
        /* the medusa-overshoot find_hell() arm and the Gehennom depth
           clamps only matter below Medusa; recorded there */
        if (game.u.uz.dnum === game.medusa_level?.dnum
            && newlev >= game.dungeons[game.u.uz.dnum].depth_start
                         + game.dungeons[game.u.uz.dnum].num_dunlevs)
            note_unported_tele('level_tele:find_hell');

        get_level(newlevel, newlev);

        if (newlevel.dnum === game.u.uz.dnum
            && newlevel.dlevel === game.u.uz.dlevel
            && newlev !== depth(game.u.uz)) {
            await You_cant('get there from here.');
            return;
        }
    }

    schedule_goto(newlevel, UTOTYPE_NONE, null,
                  game.flags?.verbose
                      ? 'You materialize on a different level!' : null);
}

// src/dungeon.c lev_by_name() — a level's name ("medusa", "castle") to its
// depth. The name table needs the dungeon overview data; nothing that reaches
// here today passes a name.
function lev_by_name(nam) {
    if (nam && !/^[-0-9]/.test(nam))
        note_unported_tele('level_tele:lev_by_name');
    return 0;
}

// src/hack.c next_to_u() — is everything that follows the hero adjacent?
// Only a leashed pet or a ball and chain can fail it, and neither is modelled.
function next_to_u() {
    return true;
}

const isdigit = (c) => c >= '0' && c <= '9';
const Teleport_control = () => !!game.u?.uprops?.TELEPORT_CONTROL;
const Stunned = () => !!game.u?.uprops?.STUNNED;
const Confusion = () => !!game.u?.uprops?.CONFUSION;

function note_unported_tele(what) {
    (game.unported ||= new Set()).add(what);
}

// src/teleport.c:2190 random_teleport_level()
export function random_teleport_level() {
    const uz = game.u.uz;
    let nlev, max_depth, min_depth;
    const cur_depth = depth(uz);

    /* single_level_branch() is Is_knox() in C (dungeon.c:1967) */
    if (!rn2(5) || Is_knox_level(uz) || In_endgame(uz))
        return cur_depth;

    if (In_quest(uz)) {
        let bottom = dunlevs_in_dungeon(uz);
        const qlocate_depth = game.qlocate_level?.dlevel ?? 0;
        /* if hero hasn't reached the middle locate level yet,
           no one can randomly teleport past it */
        if ((game.dungeons[uz.dnum].dunlev_ureached ?? 0) < qlocate_depth)
            bottom = qlocate_depth;
        min_depth = game.dungeons[uz.dnum].depth_start;
        max_depth = bottom + (game.dungeons[uz.dnum].depth_start - 1);
    } else {
        min_depth = 1;
        max_depth = dunlevs_in_dungeon(uz)
                    + (game.dungeons[uz.dnum].depth_start - 1);
        /* can't reach Sanctum if the invocation hasn't been performed */
        if (game.dungeons[uz.dnum].flags?.hellish && !game.u.uevent?.invoked)
            max_depth -= 1;
    }

    /* Get a random value relative to the current dungeon.
       Range is 1 to current+3, current not counting */
    nlev = rn2(cur_depth + 3 - min_depth) + min_depth;
    if (nlev >= cur_depth)
        nlev++;

    if (nlev > max_depth) {
        nlev = max_depth;
        /* teleport up if already on bottom */
        if (Is_botlevel_tele(uz))
            nlev -= rnd(3);
    }
    if (nlev < min_depth) {
        nlev = min_depth;
        if (nlev === cur_depth) {
            nlev += rnd(3);
            if (nlev > max_depth)
                nlev = max_depth;
        }
    }
    return nlev;
}

// src/dungeon.c Is_botlevel() — bottom of its dungeon
function Is_botlevel_tele(lev) {
    return lev.dlevel === dunlevs_in_dungeon(lev);
}

// src/teleport.c u_on_newpos() — move the hero to <x,y>.
//
// js/mklev.js has a private copy of this from level generation; C keeps the
// one definition here. They should be consolidated.
function u_on_newpos(x, y) {
    game.u.ux = x;
    game.u.uy = y;
    /* u.usteed follows; cliparound() is a no-op on an 80x21 map */
}

// src/teleport.c teleok() — may the hero teleport onto <x,y>?
function teleok(x, y, trapok) {
    if (!trapok) {
        /* allow teleportation onto vibrating square, it's not a real trap;
           also allow pits and holes if levitating or flying */
        const trap = t_at(x, y);

        if (!trap)
            trapok = true;
        else if (trap.ttyp === VIBRATING_SQUARE)
            trapok = true;
        else if ((is_pit(trap.ttyp) || is_hole(trap.ttyp))
                 && game.u.uprops?.LEVITATION)
            trapok = true;

        if (!trapok)
            return false;
    }
    if (!goodpos(x, y, game.youmonst, 0))
        return false;
    /* the caller's remaining tests (in_mklev, sokoban, vault guard) need
       state no reachable teleport has yet */
    return true;
}

// src/teleport.c teleds() — put the hero at <nux,nuy>.
//
// Only the plain path is live: an unpunished, unswallowed hero with no ball
// and chain. The ball/chain drag, the mimic un-hide and the vault-guard arms
// are recorded.
export async function teleds(nux, nuy, teleds_flags) {
    const is_teleport = !(teleds_flags & TELEDS_ALLOW_DRAG);

    if (game.uball || game.u.uswallow || game.u.utrap)
        note_unported_teleport('teleds:ball_or_swallow');

    const ux0 = game.u.ux, uy0 = game.u.uy;
    game.u.ux0 = ux0;
    game.u.uy0 = uy0;
    u_on_newpos(nux, nuy);

    newsym(ux0, uy0);           /* clear the old position */
    vision_recalc(0);           /* vision before effects */

    if (is_teleport && game.flags?.verbose)
        await You('materialize in %s different place.', 'a');

    await spoteffects(true);
}

/* src/teleport.h TELEDS_* */
export const TELEDS_NO_FLAGS = 0, TELEDS_ALLOW_DRAG = 1, TELEDS_TELEPORT = 2;

// src/teleport.c:850 scrolltele() — the controlled-teleport prompt.
//
// Only the controlled arm is ported: Teleport_control or wizard mode, hero
// conscious. The Amulet/W-tower disorientation, the uncontrolled random
// destination and the level-teleport arms are recorded.
async function scrolltele(scroll) {
    const cc = { x: 0, y: 0 };

    if ((game.u.uhave?.amulet) && !rn2(3)) {
        note_unported_teleport('scrolltele:disoriented');
        return;
    }
    const controlled = (game.u.uprops?.TELEPORT_CONTROL
                        || (scroll && scroll.blessed) || game.wizard);
    if (!controlled) {
        note_unported_teleport('scrolltele:uncontrolled');
        return;
    }
    if (unconscious()) {
        await pline('Being unconscious, you cannot control your teleport.');
        return;
    }

    /* "you and <steed>" when riding */
    const whobuf = 'you';
    await pline(`Where do ${whobuf} want to be teleported?`);
    if (scroll)
        note_unported_teleport('scrolltele:learnscroll');
    cc.x = game.u.ux;
    cc.y = game.u.uy;
    if (isok(game.iflags?.travelcc?.x, game.iflags?.travelcc?.y)) {
        /* The player showed some interest in traveling here; pre-suggest
           this coordinate. */
        cc.x = game.iflags.travelcc.x;
        cc.y = game.iflags.travelcc.y;
    }
    if ((await getpos(cc, true, 'the desired position')) < 0)
        return;                 /* abort */
    /* possible extensions: introduce a small error if magic power is low;
       allow transfer to solid rock */
    if (teleok(cc.x, cc.y, false)) {
        await teleds(cc.x, cc.y, TELEDS_TELEPORT);
        return;
    }
    await pline('Sorry...');
}

// src/teleport.c:842 tele()
export async function tele() {
    await scrolltele(null);
}

// src/teleport.c:1035 dotele() — `break_the_rules` is wizard-mode ^T.
async function dotele(break_the_rules) {
    const trap = t_at(game.u.ux, game.u.uy);

    if (trap) {
        note_unported_teleport('dotele:trap');
        return 0;
    }
    if (!break_the_rules) {
        /* the Teleportation-intrinsic and spell-casting gate */
        note_unported_teleport('dotele:not_wizard');
        return 0;
    }

    if (game.iflags?.travelcc)
        game.iflags.travelcc.x = game.iflags.travelcc.y = 0;
    await tele();
    /* next_to_u() drags adjacent pets along */
    note_unported_teleport('dotele:next_to_u');

    await morehungry(100);
    return 1;
}

// src/teleport.c:919 dotelecmd() — the ^T command.
export async function dotelecmd() {
    /* normal mode; ignore 'm' prefix if it was given */
    if (!game.wizard)
        return (await dotele(false)) ? ECMD_TIME : ECMD_OK;

    /* wizard mode without the 'm' prefix ignores every restriction; with it,
       C puts up a menu of teleport flavours, which is recorded */
    if (game.iflags?.menu_requested) {
        note_unported_teleport('dotelecmd:menu');
        return ECMD_OK;
    }
    const res = await dotele(true);
    return res ? ECMD_TIME : ECMD_OK;
}

// src/teleport.c:196 enexto() — scary-aware first, then unrestricted.
export function enexto(cc, xx, yy, mdat) {
    return (enexto_core(cc, xx, yy, mdat, GP_CHECKSCARY, goodpos)
            || enexto_core(cc, xx, yy, mdat, NO_MM_FLAGS, goodpos));
}
