// mthrowu.js — Monster ranged throw/shoot (partial).
// C ref: mthrowu.c thrwmu / monshoot / m_throw / ohitmon / thitu /
//         lined_up / m_lined_up / spitmm / spitmu / breamm / breamu /
//         u_catch_thrown_obj / drop_throw.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    distmin, dist2, m_at, m_carrying, seemimic, setmangry,
} from './mon.js';
import {
    COLNO, ROWNO, BOLT_LIM, IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED,
    NEED_WEAPON, NEED_RANGED_WEAPON, SLT_ENCUMBER, Is_rogue_level, W_WEP,
    POTHIT_MONST_THROW, POTHIT_OTHER_THROW, LAVAWALL, IS_WATERWALL, Upolyd, M_AP_TYPE,
    M_AP_NOTHING, M_AP_MONSTER, u_at, P_NONE,
    DISP_FLASH, DISP_END, XKILL_NOMSG,
    M_ATTK_MISS, M_ATTK_HIT, EDOG,
    BZ_OFS_AD, BZ_VALID_ADTYP, BZ_M_BREATH, M_SEEN_REFL,
} from './const.js';
import { cansee, couldsee, clear_path } from './vision.js';
import {
    place_object, splitobj, stackobj, obj_extract_self, delobj, objects_at,
    mksobj,
} from './mkobj.js';
import { observe_object } from './invent.js';
import {
    MON_WEP, select_rwep, mon_wield_item, monmulti, dmgval, hitval,
    should_mulch_missile,
} from './weapon.js';
import { find_mac, mondied } from './mhitm.js';
import { xkilled } from './uhitm.js';
import { ammo_and_launcher, is_launcher } from './wield.js';
import { acurr, A_DEX, A_STR, exercise } from './attrib.js';
import { calc_capacity } from './invent.js';
import { losehp, nomul, maybe_half_phys } from './hack.js';
import { finish_losehp_done } from './end.js';
import {
    pline, mon_visible, see_with_infrared, tmp_at, obj_glyph,
    nh_delay_output, newsym, canspotmon,
} from './display.js';
import { Monnam, mon_nam } from './do_name.js';
import { nohands, mons, throws_rocks, MZ_MEDIUM, nonliving } from './monsters.js';
import { xname, singular, an, vtense, the } from './objnam.js';
import {
    VENOM_CLASS, POTION_CLASS, WEAPON_CLASS, GEM_CLASS, TOOL_CLASS,
    objectNames,
} from './objects.js';
import {
    PM_MONK, PM_ROGUE, PM_HUMAN,
} from './generated/monsters_data.js';
import { potionhit } from './potion.js';
import { dobuzz } from './zap.js';
import {
    m_seenres, cvt_adtyp_to_mseenres, get_atkdam_type,
} from './mondata.js';

const BOULDER = objectNames.indexOf('BOULDER');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const WAN_STRIKING = objectNames.indexOf('WAN_STRIKING');
const BLINDING_VENOM = objectNames.indexOf('BLINDING_VENOM');
const ACID_VENOM = objectNames.indexOf('ACID_VENOM');
/** C ref: monattk.h — spit / breath damage types. */
const AD_BLND = 11;
const AD_DRST = 7;
const AD_ACID = 8;
const AD_SLEE = 4;

/** C ref: mthrowu.c breathwep[] — Hallucination rnd_hallublast deferred. */
const BREATHWEP = [
    'fragments', 'fire', 'frost', 'sleep gas', 'a disintegration blast',
    'lightning', 'poison gas', 'acid', 'strange breath #8',
    'strange breath #9',
];

/** C ref: hacklib.c s_suffix — local for cancelled-spit dry rattle. */
function s_suffix(s) {
    if (!s) return "its";
    if (s === 'it' || s === 'It') return `${s}s`;
    if (s === 'you' || s === 'You') return `${s}r`;
    if (s.endsWith('s') || s.endsWith('z') || s.endsWith('x')
        || s.endsWith('ch') || s.endsWith('sh')) {
        return `${s}'`;
    }
    return `${s}'s`;
}

/**
 * C ref: pline.c You_hear — acoustics/Deaf gate; Unaware/Underwater deferred.
 */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/**
 * C ref: mthrowu.c m_has_launcher_and_ammo — wielded launcher + matching ammo.
 */
export function m_has_launcher_and_ammo(mtmp) {
    const mwep = MON_WEP(mtmp);
    if (!mwep || !is_launcher(mwep)) return false;
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if (ammo_and_launcher(otmp, mwep)) return true;
    }
    return false;
}

function sgn(n) {
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

function isok(x, y) {
    return x >= 1 && x < COLNO && y >= 0 && y < ROWNO;
}

function closed_door(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

/** C ref: mthrowu.c blocking_terrain — wall/door/waterwall/lavawall. */
function blocking_terrain(x, y) {
    if (!isok(x, y)) return true;
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ ?? 0;
    if (IS_OBSTRUCTED(typ) || closed_door(x, y)
        || IS_WATERWALL(typ) || typ === LAVAWALL) {
        return true;
    }
    return false;
}

function sobj_at(otyp, x, y) {
    // objects_at returns nexthere chain head, not an array
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if (o.otyp === otyp) return o;
    }
    return null;
}

/**
 * C ref: display.h _canseemon — cansee/infrared + mon_visible (worms deferred).
 */
function canseemon(mtmp) {
    if (!mtmp) return false;
    if (!(cansee(mtmp.mx, mtmp.my) || see_with_infrared(mtmp))) return false;
    return mon_visible(mtmp);
}

/** C ref: zap.c exclam — punctuation by damage force. */
function exclam(force) {
    if (force < 0) return '?';
    if (force <= 4) return '.';
    return '!';
}

/** C ref: hacklib.c upstart — capitalize first letter in place. */
function upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** C invent.c freehand — either hand free (uwep not bimanual / uswap empty). */
function freehand() {
    const u = game.u || {};
    if (!u.uwep) return true;
    const big = !!(game.objects?.[u.uwep.otyp]?.oc_big);
    if (!big) return true;
    return !u.uswapwep;
}

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

/**
 * C ref: mthrowu.c linedup — straight line + couldsee/clear_path, then
 * optional boulder walk with rn2(2+boulderspots) when boulderhandling≠0.
 * Sets game._tbx/_tby like gt.tbx/gt.tby.
 * boulderhandling: 0=block, 1=ignore boulders, 2=conditionally block.
 */
export function linedup(ax, ay, bx, by, boulderhandling = 0) {
    game._tbx = ax - bx;
    game._tby = ay - by;
    if (!game._tbx && !game._tby) return false;
    if ((!game._tbx || !game._tby || Math.abs(game._tbx) === Math.abs(game._tby))
        && distmin(game._tbx, game._tby, 0, 0) < BOLT_LIM) {
        // C: u_at(ax,ay) ? couldsee(bx,by) : clear_path(ax,ay,bx,by)
        if (u_at(ax, ay) ? !!couldsee(bx, by) : !!clear_path(ax, ay, bx, by)) {
            return true;
        }
        if (boulderhandling === 0) return false;
        let cx = bx;
        let cy = by;
        const dx = sgn(ax - bx);
        const dy = sgn(ay - by);
        let boulderspots = 0;
        do {
            cx += dx;
            cy += dy;
            if (blocking_terrain(cx, cy)) return false;
            if (sobj_at(BOULDER, cx, cy)) boulderspots++;
        } while (cx !== ax || cy !== ay);
        if (boulderhandling === 1 || rn2(2 + boulderspots) < 2) return true;
    }
    return false;
}

/**
 * C ref: mthrowu.c m_lined_up — line-of-fire vs mtarg (hero or monster).
 * Hero: mux/muy + Upolyd concealment rn2(25) + boulderhandling 1|2.
 * Mon-mon: mtarg mx/my + boulderhandling 0.
 */
export function m_lined_up(mtarg, mtmp) {
    const you = game.youmonst;
    const utarget = mtarg === you || mtarg === game.u;
    const u = game.u || {};
    const tx = utarget ? (mtmp.mux ?? u.ux) : mtarg.mx;
    const ty = utarget ? (mtmp.muy ?? u.uy) : mtarg.my;
    const ignore_boulders = utarget && (throws_rocks(mtmp.data)
        || !!m_carrying(mtmp, WAN_STRIKING));
    // C: utarget && Upolyd && rn2(25) && (uundetected || unusual AP)
    if (utarget && Upolyd(u) && rn2(25)) {
        const ap = M_AP_TYPE(you);
        if (u.uundetected || (ap !== M_AP_NOTHING && ap !== M_AP_MONSTER)) {
            return false;
        }
    }
    return linedup(tx, ty, mtmp.mx, mtmp.my,
        utarget ? (ignore_boulders ? 1 : 2) : 0);
}

/**
 * C ref: mthrowu.c lined_up — m_lined_up vs hero.
 */
export function lined_up(mtmp) {
    return m_lined_up(game.youmonst || game.u, mtmp);
}

/**
 * C ref: mthrowu.c breathwep_name — Hallucination path deferred.
 */
function breathwep_name(typ) {
    return BREATHWEP[BZ_OFS_AD(typ)] || 'strange breath';
}

/**
 * C ref: mthrowu.c spitmm — monster spits venom at mtarg (hero or mon).
 * mksobj always when lined up (next_ident); then rn2(BOLT_LIM-distmin)
 * decides whether to throw or discard. Named omissions: Soundeffect;
 * isminion pet-hunger skip already gated.
 */
export async function spitmm(mtmp, mattk, mtarg) {
    if (mtmp.mcan) {
        const u = game.u || {};
        const lim2 = BOLT_LIM * BOLT_LIM;
        if (!(u.Deaf || game.flags?.acoustics === false)
            && dist2(mtmp.mx, mtmp.my, u.ux, u.uy) < lim2) {
            if (canspotmon(mtmp)) {
                await pline(
                    `A dry rattle comes from ${s_suffix(mon_nam(mtmp))} throat.`,
                );
            } else {
                await You_hear('a dry rattle nearby.');
            }
        }
        return M_ATTK_MISS;
    }
    if (m_lined_up(mtarg, mtmp)) {
        const you = game.youmonst;
        const utarg = mtarg === you || mtarg === game.u;
        const u = game.u || {};
        const tx = utarg ? (mtmp.mux ?? u.ux) : mtarg.mx;
        const ty = utarg ? (mtmp.muy ?? u.uy) : mtarg.my;
        const adtyp = mattk?.adtyp | 0;
        let otmp;
        if (adtyp === AD_BLND || adtyp === AD_DRST) {
            otmp = mksobj(BLINDING_VENOM, true, false);
        } else {
            // C: default + AD_ACID → ACID_VENOM (impossible on bad type)
            otmp = mksobj(ACID_VENOM, true, false);
        }
        if (!rn2(BOLT_LIM - distmin(mtmp.mx, mtmp.my, tx, ty))) {
            if (canseemon(mtmp)) {
                await pline(`${Monnam(mtmp)} spits venom!`);
            }
            if (!utarg) game.mtarget = mtarg;
            try {
                await m_throw(
                    mtmp, mtmp.mx, mtmp.my,
                    Math.sign(game._tbx || 0), Math.sign(game._tby || 0),
                    distmin(mtmp.mx, mtmp.my, tx, ty), otmp,
                );
            } finally {
                game.mtarget = null;
            }
            nomul(0);
            // C: tame !isminion → EDOG hungrytime -= 5
            if (mtmp.mtame && !mtmp.isminion) {
                const dog = EDOG(mtmp);
                if (dog && (dog.hungrytime | 0) > 1) {
                    dog.hungrytime = (dog.hungrytime | 0) - 5;
                }
            }
            return M_ATTK_HIT;
        }
        // C: discard unused venom — obj_extract_self + obfree
        obj_extract_self(otmp);
        otmp.where = 0;
    }
    return M_ATTK_MISS;
}

/**
 * C ref: mthrowu.c spitmu — spitmm vs hero.
 */
export async function spitmu(mtmp, mattk) {
    return spitmm(mtmp, mattk, game.youmonst || game.u);
}

/**
 * C ref: mthrowu.c breamm — monster breath weapon at mtarg.
 * Envelope: m_lined_up; mcan cough; m_seenres/REFL skip; !mspec_used &&
 * rn2(3) → dobuzz(BZ_M_BREATH); mspec_used / pet hunger. Named omissions:
 * Hallucination breathwep_name; Soundeffect cough; AD_SLEE Sleep_res
 * mspec bump uses flat Sleep_resistance; mon-mon mattackm AT_BREA deferred
 * (import cycle — hero path via breamu/mattacku).
 */
export async function breamm(mtmp, mattk, mtarg) {
    const typ = get_atkdam_type(mattk?.adtyp | 0);
    const you = game.youmonst;
    const utarget = mtarg === you || mtarg === game.u;
    const u = game.u || {};

    if (m_lined_up(mtarg, mtmp)) {
        if (mtmp.mcan) {
            if (!(u.Deaf || game.flags?.acoustics === false)) {
                if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} coughs.`);
                } else {
                    await You_hear('a cough.');
                }
            }
            return M_ATTK_MISS;
        }

        // C: if we've seen the actual resistance, don't bother, or
        // if we're close by and they reflect, just jump the player
        if (utarget && (m_seenres(mtmp, cvt_adtyp_to_mseenres(typ))
            || m_seenres(mtmp, M_SEEN_REFL))) {
            return M_ATTK_HIT;
        }

        if (!mtmp.mspec_used && rn2(3)) {
            if (BZ_VALID_ADTYP(typ)) {
                if (canseemon(mtmp)) {
                    await pline(
                        `${Monnam(mtmp)} breathes ${breathwep_name(typ)}!`,
                    );
                }
                game.buzzer = mtmp;
                try {
                    await dobuzz(
                        BZ_M_BREATH(BZ_OFS_AD(typ)),
                        mattk?.damn | 0,
                        mtmp.mx, mtmp.my,
                        sgn(game._tbx || 0), sgn(game._tby || 0),
                        utarget, utarget, false,
                    );
                } finally {
                    game.buzzer = null;
                }
                nomul(0);
                // C: breath runs out sometimes; don't if target fell asleep
                if (!utarget || !rn2(3)) {
                    mtmp.mspec_used = 8 + rn2(18);
                }
                if (utarget && typ === AD_SLEE) {
                    const Sleep_resistance = !!(u.Sleep_resistance
                        || u.HSleep_resistance || u.ESleep_resistance);
                    if (!Sleep_resistance) {
                        mtmp.mspec_used = (mtmp.mspec_used | 0) + rnd(20);
                    }
                }
                if (mtmp.mtame && !mtmp.isminion) {
                    const dog = EDOG(mtmp);
                    if (dog && (dog.hungrytime | 0) >= 10) {
                        dog.hungrytime = (dog.hungrytime | 0) - 10;
                    }
                }
            }
            // C: else impossible("Breath weapon …") — no RNG
        } else {
            return M_ATTK_MISS;
        }
    }
    return M_ATTK_HIT;
}

/**
 * C ref: mthrowu.c breamu — breamm vs hero.
 */
export async function breamu(mtmp, mattk) {
    return breamm(mtmp, mattk, game.youmonst || game.u);
}

/**
 * C ref: mthrowu.c thitu — hit/miss vs hero AC; onm via an(xname)/mshot.
 * Multishot mshot_xname "the Nth" prefix deferred (single-shot path).
 */
export async function thitu(tlev, dam, objp, name) {
    const obj = objp ? objp.obj : null;
    const u = game.u || {};
    const Blind = !!(u.Blind || u.ublind);
    const verbose = game.flags?.verbose !== false;
    let onmbuf;
    if (!name) {
        if (!obj) throw new Error('thitu: name & obj both null');
        // quan>1 → doname deferred; single missile uses xname (mshot_xname)
        onmbuf = singular(obj, xname) || xname(obj) || 'missile';
        name = onmbuf;
    } else {
        onmbuf = name;
    }
    // obj_is_pname → the(name) deferred; quan>1 keeps bare name
    const onm = (obj && (obj.quan | 0) > 1) ? name : an(name);

    const uac = u.uac ?? 10;
    const dieroll = rnd(20);
    if (uac + tlev <= dieroll) {
        game._mesg_given = (game._mesg_given || 0) + 1;
        // C: miss pline before return — await so --More-- keeps caller tmp_at
        if (Blind || !verbose) {
            await pline('It misses.');
        } else if (uac + tlev <= dieroll - 2) {
            const subj = upstart(onm);
            await pline(`${subj} ${vtense(onm, 'miss')} you.`);
        } else {
            await pline(`You are almost hit by ${onm}.`);
        }
        return 0;
    }
    // C: You("are hit…") then losehp — await so --More-- on prior topline
    // still shows m_throw tmp_at flash and pre-damage botl HP.
    if (Blind || !verbose) {
        await pline(`You are hit${exclam(dam)}`);
    } else {
        await pline(`You are hit by ${onm}${exclam(dam)}`);
    }
    // C: losehp → done(DIED) noreturn — skip exercise on fatal
    losehp(dam, onm, /* KILLED_BY */ 1);
    if (game.program_state?.gameover) {
        await finish_losehp_done();
        return 1;
    }
    exercise(A_STR, false);
    return 1;
}

/**
 * C ref: mthrowu.c u_catch_thrown_obj.
 */
function u_catch_thrown_obj(otmp) {
    let catch_chance = 100 - acurr(A_DEX);
    if (Role_if(PM_MONK) || Role_if(PM_ROGUE)) catch_chance -= 20;
    const u = game.u || {};
    if (!u.Blind && !u.Confusion && !u.Stunned && !u.Fumbling
        && otmp.oclass !== VENOM_CLASS
        && !nohands(mons(PM_HUMAN))
        && freehand()
        && calc_capacity(otmp.owt || 0) <= SLT_ENCUMBER
        && !rn2(catch_chance)) {
        // hold_another_object deferred — object leaves flight path
        return true;
    }
    return false;
}

/**
 * C ref: mthrowu.c drop_throw — mulch or place+stack.
 */
function drop_throw(obj, ohit, x, y) {
    let broken = false;
    const n = objectNames[obj.otyp];
    if (n === 'CREAM_PIE' || obj.oclass === VENOM_CLASS
        || (ohit && n === 'EGG')) {
        broken = true;
    } else {
        broken = !!(ohit && should_mulch_missile(obj));
    }
    if (broken) {
        delobj(obj);
    } else {
        // flooreffects / ship_object deferred
        place_object(obj, x, y);
        stackobj(obj);
    }
    game._thrownobj = null;
    return broken;
}

/** C ref: obj.h is_weptool */
function is_weptool(otmp) {
    return otmp?.oclass === TOOL_CLASS
        && ((game.objects?.[otmp.otyp]?.oc_skill | 0) !== P_NONE);
}

/**
 * C ref: dothrow.c omon_adj — size/sleep/immobile/otyp to-hit adjust.
 * Named omissions: mon_notices rn2(10) unfreeze when immobilized.
 */
function omon_adj(mon, obj, mon_notices) {
    let tmp = 0;
    tmp += ((mon.data?.msize ?? MZ_MEDIUM) - MZ_MEDIUM);
    if (mon.msleeping) tmp += 2;
    if (!mon.mcanmove || !(mon.data?.mmove)) {
        tmp += 4;
        // C: mon_notices && mmove && !rn2(10) → unfreeze; deferred
        void mon_notices;
    }
    const n = objectNames[obj.otyp];
    if (obj.otyp === HEAVY_IRON_BALL) {
        if (obj !== game.u?.uball) tmp += 2;
    } else if (n === 'BOULDER' || obj.otyp === BOULDER) {
        tmp += 6;
    } else if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
        || obj.oclass === GEM_CLASS) {
        tmp += hitval(obj, mon);
    }
    return tmp;
}

function The(str) {
    const t = the(str);
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/** C ref: zap.c miss — missile miss message. */
async function miss(str, mtmp) {
    const bx = game.bhitpos?.x ?? mtmp.mx;
    const by = game.bhitpos?.y ?? mtmp.my;
    const whom = ((cansee(bx, by) || canspotmon(mtmp))
        && game.flags?.verbose !== false)
        ? mon_nam(mtmp) : 'it';
    await pline(`${The(str)} ${vtense(str, 'miss')} ${whom}.`);
}

/** C ref: zap.c hit — missile hit message. */
async function hit(str, mtmp, force) {
    const bx = game.bhitpos?.x ?? mtmp.mx;
    const by = game.bhitpos?.y ?? mtmp.my;
    const verbosely = game.flags?.verbose !== false
        && (cansee(bx, by) || canspotmon(mtmp));
    const whom = verbosely ? mon_nam(mtmp) : 'it';
    await pline(`${The(str)} ${vtense(str, 'hit')} ${whom}${force}`);
}

/**
 * C ref: mthrowu.c ohitmon — missile hits another monster.
 * Returns true if missile is done (stop flight); false to keep going.
 *
 * Named omissions: shade_miss (caller); distant_name/mshot_xname;
 * spec_abon; stone_missile/passes_rocks; poison/silver/acid/egg
 * petrify; can_blnd; vampshifter destroy verb;
 * mon_notices unfreeze in omon_adj.
 * Rolling boulder (range==-1): after drop_throw, re-extract and return
 * false so launch_obj keeps rolling (D-0700 / mthrowu.c ohitmon).
 */
export async function ohitmon(mtmp, otmp, range, verbose) {
    const bx = game.bhitpos?.x ?? mtmp.mx;
    const by = game.bhitpos?.y ?? mtmp.my;
    game.notonhead = (bx !== mtmp.mx || by !== mtmp.my);

    const ismimic = M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) !== M_AP_MONSTER;
    const vis = cansee(bx, by);
    if (vis) observe_object(otmp);

    let tmp = 5 + find_mac(mtmp) + omon_adj(mtmp, otmp, false);
    const marcher = game.marcher;
    if (marcher && game.mtarget === mtmp) {
        if ((marcher.m_lev | 0) > 5) tmp += (marcher.m_lev | 0) - 5;
        // mon_launcher artifact spec_abon deferred
    }

    // C: if (tmp < rnd(20)) miss; else hit
    if (tmp < rnd(20)) {
        if (!ismimic) {
            if (vis) {
                await miss(xname(otmp), mtmp);
            } else if (verbose && !game.mtarget) {
                await pline('It is missed.');
            }
        }
        if (!range) {
            drop_throw(otmp, false, mtmp.mx, mtmp.my);
            return true;
        }
        return false;
    }

    if (otmp.oclass === POTION_CLASS) {
        if (ismimic) seemimic(mtmp);
        mtmp.msleeping = 0;
        await potionhit(mtmp, otmp, POTHIT_OTHER_THROW);
        return true;
    }

    // stone_missile && passes_rocks → harmless deferred
    const harmless = false;
    let damage = dmgval(otmp, mtmp);
    const n = objectNames[otmp.otyp];
    if (n === 'ACID_VENOM' /* && resists_acid */) {
        // resists_acid → damage=0 deferred
    }

    if (ismimic) seemimic(mtmp);
    mtmp.msleeping = 0;

    if (vis) {
        if (n === 'EGG') {
            await pline(`Splat!  ${Monnam(mtmp)} is hit with an egg!`);
        } else {
            const how = harmless
                ? ` but passes harmlessly through ${mhim(mtmp)}.`
                : exclam(damage);
            await hit(xname(otmp), mtmp, how);
        }
    } else if (verbose && !game.mtarget) {
        const punct = exclam(damage);
        await pline(
            `${n === 'EGG' ? 'Splat!  ' : ''}${Monnam(mtmp)} is hit${punct}`,
        );
    }

    // poison / silver / acid burn / egg petrify / can_blnd deferred

    if (!harmless && (mtmp.mhp | 0) > 0) {
        mtmp.mhp = (mtmp.mhp | 0) - damage;
        if ((mtmp.mhp | 0) < 1) {
            if (vis || (verbose && !game.mtarget)) {
                const verb = (nonliving(mtmp.data) || !canspotmon(mtmp))
                    ? 'destroyed' : 'killed';
                await pline(`${Monnam(mtmp)} is ${verb}!`);
            }
            // C: !mon_moving && (otyp!=BOULDER || range>=0 || otrapped)
            //    → xkilled(NOMSG); else mondied (corpse_chance)
            if (!game.context?.mon_moving
                && ((otmp.otyp | 0) !== BOULDER
                    || (range | 0) >= 0
                    || otmp.otrapped)) {
                await xkilled(mtmp, XKILL_NOMSG);
            } else {
                await mondied(mtmp);
            }
        }
    }

    // C: if (!DEADMONSTER(mtmp) && !mon_moving) setmangry(mtmp, TRUE)
    if ((mtmp.mhp | 0) > 0 && !game.context?.mon_moving) {
        setmangry(mtmp, true);
    }
    // C: objgone = drop_throw(...); if (!objgone && range == -1) {
    //    obj_extract_self(otmp); return FALSE; } — rolling boulder keeps going
    const objgone = drop_throw(otmp, true, bx, by);
    if (!objgone && (range | 0) === -1) {
        obj_extract_self(otmp);
        return false;
    }
    return true;
}

function mhim(mtmp) {
    // C: mhim — "him"/"her"/"it"; sex deferred → "it"
    void mtmp;
    return 'it';
}

/**
 * C ref: mthrowu.c m_throw — flight loop; hero hit / forcehit rn2(5).
 */
export async function m_throw(mon, x, y, dx, dy, range, obj) {
    let singleobj;
    if ((obj.quan || 1) === 1) {
        if (MON_WEP(mon) === obj) {
            mon.mw = null;
            obj.owornmask = (obj.owornmask || 0) & ~W_WEP;
        }
        obj_extract_self(obj);
        singleobj = obj;
        obj = null;
    } else {
        singleobj = splitobj(obj, 1);
        obj_extract_self(singleobj);
    }
    game._thrownobj = singleobj;
    singleobj.owornmask = 0;

    // cursed slip rn2(7) deferred unless cursed
    if ((singleobj.cursed || singleobj.greased) && (dx || dy) && !rn2(7)) {
        dx = rn2(3) - 1;
        dy = rn2(3) - 1;
        if (!dx && !dy) {
            drop_throw(singleobj, false, x, y);
            return;
        }
    }

    // Pre-flight wall check (no RNG)
    if (!isok(x + dx, y + dy)
        || IS_OBSTRUCTED(game.level?.at?.(x + dx, y + dy)?.typ ?? 0)
        || closed_door(x + dx, y + dy)) {
        drop_throw(singleobj, false, x, y);
        return;
    }

    let bx = x;
    let by = y;
    game._mesg_given = 0;
    if (!game.bhitpos) game.bhitpos = {};
    game.bhitpos.x = x;
    game.bhitpos.y = y;
    // C: sym = obj->oclass; if (sym) tmp_at(DISP_FLASH, obj_to_glyph(...))
    // Hallucination rn2_on_display_rng path deferred — obj_glyph is non-hallu.
    const sym = singleobj.oclass;
    if (sym) tmp_at(DISP_FLASH, obj_glyph(singleobj));

    while (range-- > 0) {
        bx += dx;
        by += dy;
        game.bhitpos.x = bx;
        game.bhitpos.y = by;
        singleobj.ox = bx;
        singleobj.oy = by;
        // C: if (cansee(bhitpos)) observe_object(singleobj)
        if (cansee(bx, by)) observe_object(singleobj);

        const mtmp = m_at(bx, by);
        if (mtmp) {
            // C: shade_miss → clear mtmp and keep going (deferred)
            if (await ohitmon(mtmp, singleobj, range, true)) {
                break;
            }
            // miss with remaining range — keep flying past the monster
        } else {
            const u = game.u || {};
            if (u.ux === bx && u.uy === by) {
                if (game.multi) nomul(0);
                if (!u_catch_thrown_obj(singleobj)) {
                    // C: POTION_CLASS → potionhit (before thitu / egg / pie)
                    if (singleobj.oclass === POTION_CLASS) {
                        // C: await blocking pline/--More-- while flash still at prior cell
                        await potionhit(null, singleobj, POTHIT_MONST_THROW);
                        break;
                    }
                    let dam = dmgval(singleobj, null);
                    let hitv = 3 - distmin(u.ux, u.uy, mon.mx, mon.my);
                    if (hitv < -4) hitv = -4;
                    hitv += 8 + (singleobj.spe | 0);
                    if (dam < 1) dam = 1;
                    dam = maybe_half_phys(dam);
                    const box = { obj: singleobj };
                    const hitu = await thitu(hitv, dam, box, null);
                    // C: losehp→done noreturn — no drop_throw / mulch after fatal
                    if (game.program_state?.gameover) {
                        if (sym) tmp_at(DISP_END, 0);
                        return;
                    }
                    if (hitu) {
                        drop_throw(singleobj, true, u.ux, u.uy);
                        break;
                    }
                } else {
                    if (sym) tmp_at(DISP_END, 0);
                    return; // caught
                }
            }
        } // end else !mtmp (hero / empty cell)

        const forcehit = !rn2(5);
        void forcehit;
        const nextBlocked = !isok(bx + dx, by + dy)
            || IS_OBSTRUCTED(game.level?.at?.(bx + dx, by + dy)?.typ ?? 0)
            || closed_door(bx + dx, by + dy);
        if (!range || nextBlocked) {
            drop_throw(singleobj, false, bx, by);
            break;
        }
        // C: tmp_at(bhitpos); nh_delay_output() — only when flight continues
        if (sym) {
            tmp_at(bx, by);
            await nh_delay_output();
        }
    }
    // C: after loop always show final cell then DISP_END
    if (sym) {
        tmp_at(bx, by);
        await nh_delay_output();
        tmp_at(DISP_END, 0);
    }
}

/**
 * C ref: mthrowu.c monshoot — multishot + pline + m_throw loop.
 */
async function monshoot(mtmp, otmp, mwep) {
    const u = game.u || {};
    const dm = distmin(mtmp.mx, mtmp.my, mtmp.mux ?? u.ux, mtmp.muy ?? u.uy);
    const multishot = monmulti(mtmp, otmp, mwep);

    if (canseemon(mtmp)) {
        const shooting = ammo_and_launcher(otmp, mwep);
        let onm;
        if (multishot > 1) {
            onm = `${multishot} ${xname(otmp)}`;
        } else {
            // C: singular then obj_is_pname ? the : an
            onm = an(singular(otmp, xname));
        }
        // C: pline before m_throw — await any --More-- before flight flash
        await pline(`${Monnam(mtmp)} ${shooting ? 'shoots' : 'throws'} ${onm}!`);
    }

    for (let i = 1; i <= multishot; i++) {
        await m_throw(
            mtmp, mtmp.mx, mtmp.my,
            sgn(game._tbx || 0), sgn(game._tby || 0),
            dm, otmp,
        );
        if (game.program_state?.gameover) break;
        if ((mtmp.mhp | 0) < 1) break;
        // After first shot, otmp may be depleted; stop if stack gone
        if (!otmp.where && !otmp.nobj && (otmp.quan | 0) < 1 && i < multishot) {
            // stack consumed
        }
    }
}

/**
 * C ref: mthrowu.c thrwmu — select missile, line up, monshoot.
 * Polearm / autoreturn deferred.
 */
export async function thrwmu(mtmp) {
    if (Is_rogue_level(game.u?.uz)) return;

    if (!game.context) game.context = {};
    game.context.mon_moving = true;
    try {
        await thrwmu_body(mtmp);
    } finally {
        game.context.mon_moving = false;
    }
}

async function thrwmu_body(mtmp) {
    if (mtmp.weapon_check === NEED_WEAPON || !MON_WEP(mtmp)) {
        mtmp.weapon_check = NEED_RANGED_WEAPON;
        if ((await mon_wield_item(mtmp)) !== 0) return;
    }

    const otmp = select_rwep(mtmp);
    if (!otmp) return;

    const x = mtmp.mx;
    const y = mtmp.my;
    const u = game.u || {};
    const uretreating = distmin(u.ux, u.uy, x, y)
        > distmin(u.ux0 ?? u.ux, u.uy0 ?? u.uy, x, y);

    if (!lined_up(mtmp)
        || (uretreating
            && rn2(BOLT_LIM - distmin(x, y, mtmp.mux ?? u.ux, mtmp.muy ?? u.uy)))) {
        return;
    }

    const mwep = MON_WEP(mtmp);
    await monshoot(mtmp, otmp, mwep);
    nomul(0);
}
