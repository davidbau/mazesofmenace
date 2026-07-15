// mon.js — Monster metabolism / movement allotment.
// C ref: mon.c — mcalcmove, movemon, seemimic, wakeup, mon_allowflags (partial).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dochugw } from './monmove.js';
import {
    COLNO, ROWNO, IS_OBSTRUCTED, IS_DOOR, IS_TREE, D_CLOSED, D_LOCKED, D_BROKEN,
    ALLOW_ROCK, ALLOW_DIG, Is_rogue_level, NOTONL,
    M_AP_NOTHING, M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER, M_AP_TYPE,
    MSLOW, MFAST, STRAT_WAITMASK, G_GENOD,
    BOLT_LIM,
} from './const.js';
import { t_at } from './trap.js';
import {
    nohands, verysmall, throws_rocks, passes_walls, lays_eggs, mons,
    monsterNames, NON_PM, LOW_PM, mon_knows_traps, tunnels, needspick,
    is_hider, hides_under, M1_SEE_INVIS, humanoid, regenerates,
} from './monsters.js';
import { m_harmless_trap } from './trap.js';
import {
    little_to_big, big_to_little, hero_conflict, resist_conflict,
    m_canseeu,
} from './mondata.js';
import { objects_at } from './mkobj.js';
import { objectNames } from './generated/objects_data.js';
import { PM_GRID_BUG } from './generated/monsters_data.js';
import { enexto, rloc_to } from './teleport.js';
import { may_dig } from './dig.js';
import { newsym, pline } from './display.js';
import { online2 } from './hacklib.js';
import { Monnam } from './do_name.js';
import { cansee } from './vision.js';
import { fightm } from './mhitm.js';

/** C ref: mondata.h perceives — M1_SEE_INVIS. */
function perceives(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SEE_INVIS);
}

/** C ref: mon.c monlineu — online with where mon thinks hero is. */
function monlineu(mon, nx, ny) {
    return online2(nx, ny, mon.mux, mon.muy);
}

export const NORMAL_SPEED = 12;

const BOULDER = objectNames.indexOf('BOULDER');
const PICK_AXE = objectNames.indexOf('PICK_AXE');
const DWARVISH_MATTOCK = objectNames.indexOf('DWARVISH_MATTOCK');
const AXE = objectNames.indexOf('AXE');
const BATTLE_AXE = objectNames.indexOf('BATTLE_AXE');

/** C ref: invent.c m_carrying — first matching otyp in minvent chain. */
export function m_carrying(mon, otyp) {
    for (let o = mon?.minvent; o; o = o.nobj) {
        if (o.otyp === otyp) return o;
    }
    return null;
}

/** C ref: worn.c which_armor(W_ARMS) — shield blocks two-hand dig tools. */
export function mon_has_shield(mon) {
    for (let o = mon?.minvent; o; o = o.nobj) {
        if ((o.owornmask || 0) & 0x00000008 /* W_ARMS */) return true;
    }
    return false;
}

/**
 * C ref: mon.c mondead — svm.mvitals[mndx].died++ (cap 255).
 * Called from uhitm/mhitm mondead after form restore would run in C.
 */
export function record_mvitals_died(mndx) {
    if (mndx == null || mndx < LOW_PM) return;
    if (!game.mvitals) game.mvitals = [];
    const slot = game.mvitals[mndx] || (game.mvitals[mndx] = {
        mvflags: 0, born: 0, died: 0,
    });
    if ((slot.died | 0) < 255) slot.died = (slot.died | 0) + 1;
}

// C ref: hack.h NODIAG — only grid bugs
function NODIAG(monnum) {
    return monnum === PM_GRID_BUG;
}

function pm(name) {
    return monsterNames.indexOf(`PM_${name}`);
}

/**
 * C ref: mon.c can_be_hatched — return corpsenm for a typed egg, or NON_PM.
 * BREEDER_EGG (!rn2(77)) is evaluated left-to-right when lays_eggs is true
 * (except the PM_KILLER_BEE / PM_GARGOYLE fast path).
 */
export function can_be_hatched(mnum) {
    if (mnum === pm('SCORPIUS')) mnum = pm('SCORPION');

    mnum = little_to_big(mnum);
    if (mnum === pm('KILLER_BEE') || mnum === pm('GARGOYLE')
        || (lays_eggs(mons(mnum))
            && (!rn2(77)
                || (mnum !== pm('QUEEN_BEE') && mnum !== pm('WINGED_GARGOYLE'))))) {
        return mnum;
    }
    return NON_PM;
}

/**
 * C ref: mon.c dead_species — genocided species (egg checks baby form too).
 */
export function dead_species(m_idx, egg) {
    if (m_idx < LOW_PM) return true;
    const alt_idx = egg ? big_to_little(m_idx) : m_idx;
    const mv = game.mvitals || [];
    return !!((mv[m_idx]?.mvflags ?? 0) & G_GENOD)
        || !!((mv[alt_idx]?.mvflags ?? 0) & G_GENOD);
}

// C ref: mon.c undead_to_corpse — zombie/mummy/vampire → living species for corpses
export function undead_to_corpse(mndx) {
    switch (mndx) {
    case pm('KOBOLD_ZOMBIE'):
    case pm('KOBOLD_MUMMY'):
        return pm('KOBOLD');
    case pm('DWARF_ZOMBIE'):
    case pm('DWARF_MUMMY'):
        return pm('DWARF');
    case pm('GNOME_ZOMBIE'):
    case pm('GNOME_MUMMY'):
        return pm('GNOME');
    case pm('ORC_ZOMBIE'):
    case pm('ORC_MUMMY'):
        return pm('ORC');
    case pm('ELF_ZOMBIE'):
    case pm('ELF_MUMMY'):
        return pm('ELF');
    case pm('VAMPIRE'):
    case pm('VAMPIRE_LEADER'):
    case pm('HUMAN_ZOMBIE'):
    case pm('HUMAN_MUMMY'):
        return pm('HUMAN');
    case pm('GIANT_ZOMBIE'):
    case pm('GIANT_MUMMY'):
        return pm('GIANT');
    case pm('ETTIN_ZOMBIE'):
    case pm('ETTIN_MUMMY'):
        return pm('ETTIN');
    default:
        return mndx;
    }
}

export const ALLOW_U = 0x00040000;
export const ALLOW_M = 0x00080000;
export const ALLOW_TM = 0x00100000;
export const ALLOW_TRAPS = 0x00020000;
export const ALLOW_SANCT = 0x20000000;
export const ALLOW_SSM = 0x40000000;
export const OPENDOOR = 0x00400000;
export const UNLOCKDOOR = 0x00800000;
export const BUSTDOOR = 0x01000000;
// ALLOW_ROCK imported from const.js (mfndpos.h 0x02000000)

// C ref: mon.c mcalcmove()
export function mcalcmove(mon, m_moving) {
    let mmove = mon.data?.mmove ?? NORMAL_SPEED;
    // C: MSLOW / MFAST scale before optional rounding
    if (mon.mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED) mmove = Math.trunc((2 * mmove + 1) / 3);
        else mmove = 4 + Math.trunc(mmove / 3);
    } else if (mon.mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }
    // steed gallop deferred
    if (m_moving) {
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj) mmove += NORMAL_SPEED;
    }
    return mmove;
}

/**
 * C ref: monmove.c mon_regen — HP tick + mspec_used; digest_meal=false from
 * mcalcdistress (meating countdown lives in m_move).
 */
function mon_regen(mon, digest_meal) {
    const moves = game.moves | 0;
    if (moves % 20 === 0 || regenerates(mon.data)) {
        // healmon(mon, 1, 0) subset — bump HP only
        if ((mon.mhp | 0) < (mon.mhpmax | 0)) mon.mhp = (mon.mhp | 0) + 1;
    }
    if (mon.mspec_used) mon.mspec_used = (mon.mspec_used | 0) - 1;
    if (digest_meal && mon.meating) {
        mon.meating = (mon.meating | 0) - 1;
        // finish_meating deferred here (m_move path owns it)
    }
}

/**
 * C ref: mon.c m_calcdistress — once-per-turn mon timeouts / regen.
 * Named omissions: mmove==0 minliquid; decide_to_shapeshift; were_change
 * (no RNG unless cham/were present — early-return stubs).
 */
function m_calcdistress(mtmp) {
    if (!mtmp || (mtmp.mhp | 0) < 1) return;
    // mmove==0 minliquid deferred
    mon_regen(mtmp, false);
    // decide_to_shapeshift / were_change deferred (only RNG for cham/were)
    if (mtmp.mblinded && !(--mtmp.mblinded)) mtmp.mcansee = 1;
    if (mtmp.mfrozen && !(--mtmp.mfrozen)) mtmp.mcanmove = 1;
    if (mtmp.mfleetim && !(--mtmp.mfleetim)) mtmp.mflee = 0;
}

/**
 * C ref: mon.c mcalcdistress — iter_mons over fmon.
 */
export function mcalcdistress() {
    for (const mtmp of game.fmon || []) {
        m_calcdistress(mtmp);
    }
}

export function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return dx * dx + dy * dy;
}

export function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

/**
 * C ref: mon.c monnear — close enough to move/attack into.
 * Orthogonal (dist2==1) or same square; diagonal (dist2==2) only if
 * not NODIAG (grid bugs cannot act on a diagonal).
 */
export function monnear(mtmp, x, y) {
    const distance = dist2(mtmp.mx, mtmp.my, x, y);
    const monnum = mtmp.mnum ?? mtmp.data?.mndx;
    if (distance === 2 && NODIAG(monnum)) return false;
    return distance < 3;
}

/** C ref: you.h next2u — squared dist to hero ≤ 2. */
function next2u(x, y) {
    return dist2(x, y, game.u.ux, game.u.uy) <= 2;
}

function isok_xy(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

/**
 * C ref: monmove.c m_avoid_kicked_loc — peaceful/tame skip hero's kicked square.
 */
export function m_avoid_kicked_loc(mtmp, nx, ny) {
    const kl = game.kickedloc;
    if (!kl || !isok_xy(kl.x, kl.y)) return false;
    if (!(mtmp.mpeaceful || mtmp.mtame)) return false;
    if (!mtmp.mcansee || mtmp.mconf || mtmp.mstun) return false;
    if (game.Conflict || game.flags?.Conflict) return false;
    if (nx !== kl.x || ny !== kl.y) return false;
    return next2u(nx, ny);
}

/**
 * C ref: monmove.c m_avoid_soko_push_loc — Sokoban boulder-line skip.
 * Deferred until Sokoban; always false for now.
 */
export function m_avoid_soko_push_loc(_mtmp, _nx, _ny) {
    return false;
}

/**
 * C ref: mon.c seemimic — clear disguise; freemcorpsenm / light-block deferred.
 */
export function seemimic(mtmp) {
    if (!mtmp) return;
    // has_mcorpsenm / freemcorpsenm deferred
    mtmp.m_ap_type = M_AP_NOTHING;
    mtmp.mappearance = 0;
    // is_lightblocker_mappear / unblock_point deferred
    if (mtmp.mx > 0) newsym(mtmp.mx, mtmp.my);
}

/**
 * C ref: mon.c setmangry — peaceful → hostile on attack.
 * Branch envelope: core mpeaceful clear + humanoid/shk/gd pline + adjalign(-1).
 * Named omissions: Elbereth hypocrite/rnd(5)/del_engr; priest adjalign
 * coalign; growl; quest guardian / peacefuls_respond bodies.
 */
export function setmangry(mtmp, via_attack) {
    if (!mtmp) return;
    // Elbereth hypocrite arm deferred (no RNG when not on Elbereth)
    void via_attack;
    if (mtmp.mstrategy != null) mtmp.mstrategy &= ~STRAT_WAITMASK;
    if (!mtmp.mpeaceful) return;
    if (mtmp.mtame) return;
    mtmp.mpeaceful = 0;
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { record: 0, type: 0 };
    if (mtmp.ispriest) {
        // p_coaligned adjalign ± deferred → -1 like non-priest
        u.ualign.record = (u.ualign.record | 0) - 1;
    } else {
        u.ualign.record = (u.ualign.record | 0) - 1;
    }
    if (humanoid(mtmp.data) || mtmp.isshk || mtmp.isgd) {
        // couldsee gate: still pline when visible-ish (canspot deferred)
        pline(`${Monnam(mtmp)} gets angry!`);
    }
    // growl / qst_guardians_respond / peacefuls_respond deferred
}

/**
 * C ref: mon.c wakeup — clear sleep / non-monster disguise; via_attack → setmangry.
 * Named omissions: wake_msg; finish_meating; growl-on-sleep; ghod_hitsu;
 * hot_pursuit when shk && !*u.ushops.
 */
export function wakeup(mtmp, via_attack) {
    if (!mtmp) return;
    // wake_msg deferred (canseemon sleep pline)
    mtmp.msleeping = 0;
    if (M_AP_TYPE(mtmp) !== M_AP_NOTHING) {
        if (M_AP_TYPE(mtmp) !== M_AP_MONSTER) seemimic(mtmp);
    } else if (game.context?.forcefight && !game.context?.mon_moving
        && mtmp.mundetected) {
        mtmp.mundetected = 0;
        if (mtmp.mx > 0) newsym(mtmp.mx, mtmp.my);
    }
    // finish_meating deferred
    if (via_attack) {
        const was_peaceful = !!mtmp.mpeaceful;
        // was_sleeping growl deferred
        setmangry(mtmp, true);
        if (was_peaceful) {
            // ghod_hitsu / hot_pursuit deferred
        }
    }
}

export function m_at(x, y) {
    // C: level.monsters[][] — steed is remove_monster'd while mounted
    const list = game.fmon || [];
    const steed = game.u?.usteed;
    for (const m of list) {
        if (m === steed) continue;
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

/**
 * C ref: mon.c mnexto — place next to hero via enexto + rloc_to.
 * Omits mon_telecontrol / overcrowding limbo.
 */
export function mnexto(mtmp, _rlocflags = 0) {
    if (!mtmp) return;
    const u = game.u;
    if (mtmp === u?.usteed) {
        mtmp.mx = u.ux;
        mtmp.my = u.uy;
        return;
    }
    const mm = { x: 0, y: 0 };
    if (!enexto(mm, u.ux, u.uy, mtmp.data) || !isok_xy(mm.x, mm.y)) return;
    rloc_to(mtmp, mm.x, mm.y);
}

// C ref: mon.c mon_allowflags() — hostile/peaceful + dig/tunnel flags
export function mon_allowflags(mtmp) {
    let allowflags = 0;
    const Conflict = hero_conflict();
    // C: can_open = !(nohands(data) || verysmall(data))
    const can_open = !(nohands(mtmp.data) || verysmall(mtmp.data));
    // C: can_tunnel = tunnels && !Is_rogue_level; needspick hostiles close
    // enough prefer weapon over dig (same gate as m_move).
    let can_tunnel = tunnels(mtmp.data) && !Is_rogue_level(game.u?.uz);
    if (can_tunnel && needspick(mtmp.data)
        && ((!mtmp.mpeaceful || Conflict)
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8)) {
        can_tunnel = false;
    }
    if (mtmp.mtame) {
        allowflags |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    } else if (mtmp.mpeaceful) {
        allowflags |= ALLOW_SANCT | ALLOW_SSM;
    } else {
        allowflags |= ALLOW_U;
    }
    // C: Conflict && !resist_conflict → ALLOW_U (attacks hero)
    if (Conflict && !resist_conflict(mtmp)) {
        allowflags |= ALLOW_U;
    }
    // C: passes_walls → ALLOW_ROCK|ALLOW_WALL; throws_rocks / m_can_break_boulder → ALLOW_ROCK
    // m_can_break_boulder (wielded dig tool) deferred — named in C-JS-MAP
    if (passes_walls(mtmp.data)) allowflags |= ALLOW_ROCK; // ALLOW_WALL deferred
    if (throws_rocks(mtmp.data)) allowflags |= ALLOW_ROCK;
    if (can_tunnel) allowflags |= ALLOW_DIG;
    if (can_open) allowflags |= OPENDOOR;
    return allowflags;
}

// C ref: mon.c mfndpos() — neighbour scan; ALLOW_DIG rock/tree + thrudoor
export function mfndpos(mon, data, flag) {
    const x = mon.mx;
    const y = mon.my;
    let cnt = 0;
    data.cnt = 0;
    data.poss = data.poss || [];
    data.info = data.info || [];

    const nowloc = game.level?.at(x, y);
    const nowtyp = nowloc?.typ;
    const nowdm = nowloc?.doormask || 0;
    const nodiag = NODIAG(mon.mnum ?? mon.data?.mndx);
    const mdat = mon.data;

    let rockok = false;
    let treeok = false;
    let thrudoor = false;
    if (flag & ALLOW_DIG) {
        // C: !needspick → both; else carrying pick/axe (cursed-mwep gate deferred)
        if (!needspick(mdat)) {
            rockok = true;
            treeok = true;
        } else {
            rockok = !!(m_carrying(mon, PICK_AXE)
                || (m_carrying(mon, DWARVISH_MATTOCK) && !mon_has_shield(mon)));
            treeok = !!(m_carrying(mon, AXE)
                || (m_carrying(mon, BATTLE_AXE) && !mon_has_shield(mon)));
        }
        if (rockok || treeok) thrudoor = true;
    }

    const maxx = Math.min(x + 1, COLNO - 1);
    const maxy = Math.min(y + 1, ROWNO - 1);
    // C: monseeu is constant across the neighbour scan
    const Invis = !!(game.u?.Invis);
    const monseeu = !!(mon.mcansee && (!Invis || perceives(mdat)));
    for (let nx = Math.max(1, x - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
            if (nx === x && ny === y) continue;
            const loc = game.level?.at(nx, ny);
            if (!loc) continue;
            const ntyp = loc.typ;
            // C: obstructed unless ALLOW_WALL passwall or diggable rock/tree
            if (IS_OBSTRUCTED(ntyp)
                && !((IS_TREE(ntyp) ? treeok : rockok) && may_dig(nx, ny))) {
                continue;
            }
            // peaceful shop/temple dig avoid deferred
            if (IS_DOOR(ntyp)) {
                const dm = loc.doormask || 0;
                if (((dm & D_CLOSED) && !(flag & OPENDOOR))
                    || ((dm & D_LOCKED) && !(flag & UNLOCKDOOR))) {
                    if (!thrudoor) continue;
                }
            }
            // C: first diagonal checks — NODIAG + non-broken doors
            if (nx !== x && ny !== y) {
                const ndm = loc.doormask || 0;
                if (nodiag
                    || (IS_DOOR(nowtyp) && (nowdm & ~D_BROKEN))
                    || (IS_DOOR(ntyp) && (ndm & ~D_BROKEN))) {
                    continue;
                }
            }

            let info = 0;
            if ((nx === game.u.ux && ny === game.u.uy)
                || (nx === mon.mux && ny === mon.muy)) {
                if (nx === game.u.ux && ny === game.u.uy) {
                    mon.mux = game.u.ux;
                    mon.muy = game.u.uy;
                }
                if (!(flag & ALLOW_U)) continue;
                info |= ALLOW_U;
            } else if (m_at(nx, ny)) {
                // hostiles lack ALLOW_M — cannot displace/attack other mons
                if (!(flag & ALLOW_M)) continue;
                info |= ALLOW_M;
            }

            // C: sobj_at(BOULDER) without ALLOW_ROCK → skip (mon.c mfndpos)
            const obj = objects_at(nx, ny);
            if (obj) {
                let hasBoulder = false;
                for (let o = obj; o; o = o.nexthere) {
                    if (o.otyp === BOULDER) {
                        hasBoulder = true;
                        break;
                    }
                }
                if (hasBoulder) {
                    if (!(flag & ALLOW_ROCK)) continue;
                    info |= ALLOW_ROCK;
                }
            }

            // C: monseeu && monlineu → NOTONL (unicorn flag skips; else mark)
            if (monseeu && monlineu(mon, nx, ny)) {
                if (flag & NOTONL) continue;
                info |= NOTONL;
            }

            // C: harmful traps → ALLOW_TRAPS; hostiles skip known types
            // (mon.c mfndpos). Pets get ALLOW_TRAPS and check in dogmove.
            const ttmp = t_at(nx, ny);
            if (ttmp) {
                if (!m_harmless_trap(mon, ttmp)) {
                    if (!(flag & ALLOW_TRAPS)) {
                        if (mon_knows_traps(mon, ttmp.ttyp)) continue;
                    }
                    info |= ALLOW_TRAPS;
                }
            }

            data.poss[cnt] = { x: nx, y: ny };
            data.info[cnt] = info;
            cnt++;
        }
    }
    data.cnt = cnt;
    return cnt;
}

// C ref: mon.c movemon_singlemon()
async function movemon_singlemon(mtmp) {
    if (!mtmp || mtmp.mhp <= 0) return false;
    if ((mtmp.movement | 0) < NORMAL_SPEED) return false;

    mtmp.movement -= NORMAL_SPEED;
    if (mtmp.movement >= NORMAL_SPEED) game._somebody_can_move = true;

    // C: is_hider — disguised mimics spend the turn without dochug
    // (restrap / eel hideunder / minliquid / equip I_SPECIAL deferred)
    if (is_hider(mtmp.data)) {
        const ap = M_AP_TYPE(mtmp);
        if (ap === M_AP_FURNITURE || ap === M_AP_OBJECT) return false;
        if (mtmp.mundetected) return false;
    }

    // C: Conflict → fightm before dochugw (always rolls resist_conflict).
    // m_everyturn_effect / restrap post-path deferred.
    if (hero_conflict() && !mtmp.iswiz && m_canseeu(mtmp)) {
        const u = game.u;
        if (cansee(mtmp.mx, mtmp.my)
            && u
            && dist2(mtmp.mx, mtmp.my, u.ux, u.uy) <= BOLT_LIM * BOLT_LIM
            && (await fightm(mtmp))) {
            return false;
        }
    }

    await dochugw(mtmp, true);
    return false;
}

// C ref: mon.c movemon()
export async function movemon() {
    game._somebody_can_move = false;
    if (game.program_state?.gameover) return false;
    const list = game.fmon || [];
    // Snapshot — dochug may mutate list later
    for (const mtmp of list.slice()) {
        if (game.program_state?.gameover) break;
        await movemon_singlemon(mtmp);
    }
    return game._somebody_can_move;
}

/**
 * C ref: mon.c hide_monst — called from getlev when returning to a level.
 * Gate matches C; restrap / hideunder bodies deferred (named omission).
 */
export function hide_monst(mon) {
    if (!mon?.data) return;
    const hider_under = hides_under(mon.data) || mon.data.mlet === 'S_EEL';
    if (!(is_hider(mon.data) || hider_under)) return;
    if (mon.mundetected || M_AP_TYPE(mon) !== M_AP_NOTHING) return;
    // Named omission: viz_array override + restrap (+ mimic retry) + hideunder
}
