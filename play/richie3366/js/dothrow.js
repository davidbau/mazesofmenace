// dothrow.js — Throw command (minimal path for Tourist darts).
// C ref: dothrow.c dothrow / throw_obj / throwit (subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, docrt, newsym, mark_topline_seen,
} from './display.js';
import { cansee } from './vision.js';
import { rnd } from './rng.js';
import { place_object, splitobj, stackobj } from './mkobj.js';
import {
    WEAPON_CLASS, COIN_CLASS, GEM_CLASS, FOOD_CLASS,
    objectNames, objectNameStrs,
} from './objects.js';
import {
    COLNO, ROWNO, IS_SOFT, LOST_THROWN, ZAP_POS, IS_DOOR, D_CLOSED, D_LOCKED,
    P_SPEAR, P_SLING, P_DAGGER, P_SHURIKEN, P_DART, P_CROSSBOW, P_KNIFE,
    P_BOW, P_BOOMERANG,
    P_SKILLED, P_EXPERT, P_BASIC, P_UNSKILLED,
    ACCFOOD, HMON_THROWN, engulfing_u,
} from './const.js';
import { NO_COLOR } from './terminal.js';
import { obj_resists, dogfood } from './dogmove.js';
import {
    ammo_and_launcher, is_ammo, doswapweapon, doquiver_core, welded,
} from './wield.js';
import { acurr, A_DEX } from './attrib.js';
import {
    PM_CAVE_DWELLER, PM_MONK, PM_RANGER, PM_ROGUE, PM_SAMURAI,
    PM_WIZARD, PM_HEALER, PM_TOURIST, PM_CLERIC,
    PM_ELF, PM_ORC, PM_GNOME,
    monsterNames,
} from './generated/monsters_data.js';
import { xname, singular, an } from './objnam.js';
import { m_at } from './mon.js';
import { is_domestic } from './monsters.js';
import { tamedog } from './dog.js';
import { hmon } from './uhitm.js';

const PM_MONKEY = monsterNames.indexOf('PM_MONKEY');
const PM_APE = monsterNames.indexOf('PM_APE');
const PM_LICHEN = monsterNames.indexOf('PM_LICHEN');
const VEGGY = 3; // objclass.h
const EGG = objectNames.indexOf('EGG');
const CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const BLINDING_VENOM = objectNames.indexOf('BLINDING_VENOM');
const ACID_VENOM = objectNames.indexOf('ACID_VENOM');

/** C ref: cmd.c cmdq_add_ec(CQ_CANNED, …) — shared with rhack via game._cmdq_canned */
function cmdq_add_ec(fn) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    game._cmdq_canned.push(fn);
}



const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/**
 * C ref: cmd.c movecmd(sym, MV_ANY) — walk/run/rush bindings all yield a
 * direction. Capital HJKLYUBN (run) and Ctrl-dir (rush) count like h/j/…
 * @returns {{dx:number,dy:number}|null}
 */
function dir_from_key(key, ch) {
    if (ch in DIR_DX) return { dx: DIR_DX[ch], dy: DIR_DY[ch] };
    const low = typeof ch === 'string' ? ch.toLowerCase() : '';
    if (low in DIR_DX && ch === low.toUpperCase()) {
        return { dx: DIR_DX[low], dy: DIR_DY[low] };
    }
    // rush: C(dir) — keys 1..26 (ICRNL maps CR→LF = C('j'))
    if (typeof key === 'number' && key >= 1 && key <= 26) {
        const rushCh = String.fromCharCode(key + 96);
        if (rushCh in DIR_DX) return { dx: DIR_DX[rushCh], dy: DIR_DY[rushCh] };
    }
    return null;
}

/** C invent getobj ranks used by throw_ok. */
const THROW_SUGGEST = 1;
const THROW_DOWNPLAY = 2;

/**
 * C ref: dothrow.c throw_ok — SUGGEST coins + weapons (!uslinging);
 * DOWNPLAY lone uwep / known-welded. AutoReturn / gem-sling deferred.
 * @returns {0|1|2} 0 exclude, 1 suggest, 2 downplay
 */
function throw_ok(obj) {
    if (!obj) return 0;
    const u = game.u || {};
    if (obj.bknown && welded(obj)) return THROW_DOWNPLAY;
    if ((obj.quan || 1) === 1
        && (obj === u.uwep || (obj === u.uswapwep && u.twoweap))) {
        return THROW_DOWNPLAY;
    }
    if (obj.oclass === COIN_CLASS) return THROW_SUGGEST;
    if (obj.oclass === WEAPON_CLASS) return THROW_SUGGEST;
    return THROW_DOWNPLAY;
}

/** Invent-order SUGGEST letters (C getobj; DOWNPLAY selectable but hidden). */
function throwable_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && throw_ok(o) === THROW_SUGGEST) lets.push(o.invlet);
    }
    return lets.join('');
}

/**
 * C ref: invent.c getobj("throw", throw_ok) — loop on missing letter;
 * re-prompt after more() when prior topline still needs acknowledgment.
 * `?`/`*` → display_pickinv_reply (DOWNPLAY food selectable via `*`).
 */
async function getobj_throw() {
    for (;;) {
        await flush_topl_more();
        const lets = throwable_lets();
        const query = lets
            ? `What do you want to throw? [${lets} or ?*]`
            : 'What do you want to throw? [*]';
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
            const { display_pickinv_reply } = await import('./invent.js');
            const ilet = await display_pickinv_reply(ch === '*' ? '*' : lets);
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline('Never mind.');
                return null;
            }
            if (!ilet) continue;
            const picked = (game.invent || []).find((o) => o.invlet === ilet);
            if (!picked) {
                await pline("You don't have that object.");
                continue;
            }
            if (!throw_ok(picked)) {
                await pline('You cannot throw that!');
                return null;
            }
            game._pending_message = '';
            return picked;
        }
        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        if (!throw_ok(otmp)) {
            await pline('You cannot throw that!');
            return null;
        }
        game._pending_message = '';
        return otmp;
    }
}

async function getdir(prompt) {
    if (prompt) {
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);
    }
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    // Clear yn prompt before returning to the command loop (next capture).
    game._pending_message = '';
    if (key === 27 || ch === '.' || ch === ' ' || ch === '\n' || ch === '\r')
        return null;
    const dir = dir_from_key(key, ch);
    if (!dir) {
        await pline('Never mind.');
        return null;
    }
    return dir;
}

function freeinv(otmp) {
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    // Also handle when otmp was split from a stack still in invent
}

/** C ref: mondata.h befriend_with_obj — banana→monkey/ape; domestic+food. */
function befriend_with_obj(ptr, obj) {
    if (!ptr || !obj) return false;
    const mndx = ptr.mndx ?? ptr.pmidx;
    if (mndx === PM_MONKEY || mndx === PM_APE) {
        return objectNames[obj.otyp] === 'BANANA';
    }
    if (!is_domestic(ptr) || obj.oclass !== FOOD_CLASS) return false;
    // C: unicorn/horse class needs VEGGY (or lichen corpse)
    if (ptr.mlet === 'S_UNICORN') {
        const mat = game.objects?.[obj.otyp]?.oc_material ?? 0;
        if (mat === VEGGY) return true;
        const CORPSE = objectNames.indexOf('CORPSE');
        return obj.otyp === CORPSE && (obj.corpsenm | 0) === PM_LICHEN;
    }
    return true;
}

/**
 * C ref: dothrow.c thitmonst — mon-hit after bhit.
 * Ported: dieroll; EGG/CREAM_PIE/VENOM DEX `rnd(25)` → hmon; food befriend.
 * Deferred: weapon/gem/ball/boulder hit, potionhit, unicorn gems, leader catch,
 * guaranteed_hit swallow arms, tmiss wakeup polish.
 * @returns {boolean} true if obj was consumed / taken care of
 */
async function thitmonst(mon, obj) {
    const otyp = obj.otyp | 0;
    const guaranteed_hit = engulfing_u(mon);
    // C: dieroll = rnd(20) before class branches
    const dieroll = rnd(20);

    // weapon / weptool / gem / iron ball / boulder arms deferred

    // C dothrow.c:2256 — pie/egg/venom hit vs DEX (or swallow)
    if ((otyp === EGG || otyp === CREAM_PIE
            || otyp === BLINDING_VENOM || otyp === ACID_VENOM)
        && (guaranteed_hit || acurr(A_DEX) > rnd(25))) {
        await hmon(mon, obj, HMON_THROWN, dieroll);
        return true; // C: hmon used it up
    }

    // potionhit arm deferred (same DEX rnd(25) gate when reached)

    if (befriend_with_obj(mon.data, obj)
        || (mon.mtame && dogfood(mon, obj) <= ACCFOOD)) {
        if (await tamedog(mon, obj, true)) return true;
        mon.msleeping = 0;
        if (mon.mstrategy != null) mon.mstrategy &= ~0x07; // STRAT_WAITMASK approx
    }
    return false;
}

function Role_if(pm) {
    return game.urole?.mnum === pm;
}
function Race_if(pm) {
    return game.urace?.mnum === pm;
}

/** C ref: weapon.c weapon_type — abs(oc_skill). */
function weapon_type(obj) {
    if (!obj) return 0;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk < 0 ? -sk : sk;
}

/** C ref: skills.h P_SKILL — current skill rank (u.weapon_skills). */
function P_SKILL(type) {
    const slot = game.u?.weapon_skills?.[type];
    if (slot == null) return P_UNSKILLED;
    return typeof slot === 'object' ? (slot.skill ?? P_UNSKILLED) : (slot | 0);
}

/**
 * C ref: dothrow.c multishot_class_bonus — role volley extras.
 */
function multishot_class_bonus(pm, ammo, launcher) {
    let multishot = 0;
    const skill = game.objects?.[ammo.otyp]?.oc_skill ?? 0;
    switch (pm) {
    case PM_CAVE_DWELLER:
        if (skill === -P_SLING || skill === P_SPEAR) multishot++;
        break;
    case PM_MONK:
        if (skill === -P_SHURIKEN) multishot++;
        break;
    case PM_RANGER:
        if (skill !== P_DAGGER) multishot++;
        break;
    case PM_ROGUE:
        if (skill === P_DAGGER) multishot++;
        break;
    case PM_SAMURAI:
        if (ammo.otyp != null
            && objectNames[ammo.otyp] === 'YA'
            && launcher && objectNames[launcher.otyp] === 'YUMI') {
            multishot++;
        }
        break;
    default:
        break;
    }
    return multishot;
}

/**
 * C ref: dothrow.c throw_obj — multishot + split + throwit.
 * getdir is done by caller (dofire/dothrow) matching JS input boundary;
 * C calls getdir inside throw_obj — same one prompt either way.
 */
async function throw_obj(obj, shotlimit) {
    // C: coin class → throw_gold (body deferred; `$` still in getobj suggest list)
    if (obj.oclass === COIN_CLASS) return 0;

    // C ref: dothrow.c:158–237 Multishot calculations
    let multishot = 1;
    const skill = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    const uwep = game.u?.uwep || null;
    const quan = obj.quan || 1;
    if (quan > 1
        && (is_ammo(obj) ? ammo_and_launcher(obj, uwep)
            : obj.oclass === WEAPON_CLASS)
        && !(game.u?.Confusion || game.u?.Stunned
            || game.Confusion || game.Stunned)) {
        const weakmultishot = Role_if(PM_WIZARD) || Role_if(PM_CLERIC)
            || (Role_if(PM_HEALER) && skill !== P_KNIFE)
            || (Role_if(PM_TOURIST) && skill !== -P_DART)
            || game.Fumbling || game.u?.Fumbling
            || acurr(A_DEX) <= 6;

        switch (P_SKILL(weapon_type(obj))) {
        case P_EXPERT:
            multishot++;
            // FALLTHROUGH
        case P_SKILLED:
            if (!weakmultishot) multishot++;
            break;
        default:
            break;
        }
        multishot += multishot_class_bonus(game.urole?.mnum, obj, uwep);

        if (!weakmultishot) {
            if (Race_if(PM_ELF)
                && objectNames[obj.otyp] === 'ELVEN_ARROW'
                && uwep && objectNames[uwep.otyp] === 'ELVEN_BOW') {
                multishot++;
            } else if (Race_if(PM_ORC)
                && objectNames[obj.otyp] === 'ORCISH_ARROW'
                && uwep && objectNames[uwep.otyp] === 'ORCISH_BOW') {
                multishot++;
            } else if (Race_if(PM_GNOME) && skill === -P_CROSSBOW) {
                multishot++;
            }
            // quest artifact launcher bonus deferred
        }

        if (multishot > 1 && skill === -P_CROSSBOW
            && ammo_and_launcher(obj, uwep)) {
            // ACURRSTR gate deferred — still roll rnd when multishot>1
            multishot = rnd(multishot);
        }

        multishot = rnd(multishot);
        if (multishot > quan) multishot = quan;
        if (shotlimit > 0 && multishot > shotlimit) multishot = shotlimit;
    } else {
        // C: no volley path — still no rnd when quan==1 / no launcher
        multishot = 1;
    }

    const shot = ammo_and_launcher(obj, uwep);
    if (multishot > 1 || shotlimit > 0) {
        // C ref: dothrow.c throw_obj — You("%s %d %s.", shoot|throw, n,
        //   (n==1) ? singular(obj, xname) : xname(obj));
        const name = (multishot === 1) ? singular(obj, xname) : xname(obj);
        await pline(`You ${shot ? 'shoot' : 'throw'} ${multishot} ${name}.`);
    }

    for (let i = 1; i <= multishot; i++) {
        let otmp;
        if ((obj.quan || 1) > 1) {
            otmp = splitobj(obj, 1);
            // C: freeinv(otmp) after split — child may sit on invent nobj chain
            if (otmp) freeinv(otmp);
        } else {
            otmp = obj;
            freeinv(otmp);
            obj = null;
        }
        if (!otmp) break;
        await throwit(otmp);
    }
    return 1;
}
/**
 * C ref: dothrow.c breaktest() — always rolls obj_resists; darts don't break.
 */
function breaktest(obj) {
    if (!obj) return false;
    // nonbreakchance 1 for normal items
    if (obj_resists(obj, 1, 99)) return false;
    // glass / potions / eggs etc. — not needed for Tourist darts
    return false;
}

/**
 * C ref: zap.c bhit + dothrow.c throwit — fly along dx/dy; stop before
 * !ZAP_POS / closed door (bhit backs up one step), then place / breaktest.
 * Monster hit → thitmonst (D-0415 food; D-0693 pie/egg DEX); weapon deferred.
 */
async function throwit(obj) {
    const u = game.u;
    const dx = u.dx || 0;
    const dy = u.dy || 0;
    // C: urange = ACURRSTR/2, then range capped; adjacent wall needs ≥1
    let range = 5;
    // C: ammo without matching launcher → half range + hand-throw pline
    if (is_ammo(obj) && !ammo_and_launcher(obj, u.uwep)
        && obj.oclass !== GEM_CLASS) {
        range = Math.max(1, Math.trunc(range / 2));
        // C: an(skill_name(weapon_type)) + weapon_descr (P_BOW ammo → "arrow")
        const skill = Math.abs(game.objects?.[obj.otyp]?.oc_skill ?? 0);
        let skillName = 'bow';
        let descr = 'arrow';
        if (skill === P_CROSSBOW) {
            skillName = 'crossbow';
            descr = 'bolt';
        } else if (skill === P_DART) {
            skillName = 'dart';
            descr = 'dart';
        } else if (skill === P_BOOMERANG) {
            skillName = 'boomerang';
            descr = 'boomerang';
        } else if (skill === P_BOW) {
            skillName = 'bow';
            descr = 'arrow';
        } else {
            const otyp = objectNames.indexOf('BOW');
            if (otyp >= 0 && objectNameStrs[otyp]) skillName = objectNameStrs[otyp];
            descr = skillName;
        }
        await pline(
            `You aren't wielding ${an(skillName)}, so you throw your ${descr} by hand.`,
        );
    }
    obj.how_lost = LOST_THROWN;
    let x = u.ux;
    let y = u.uy;
    let hitmon = null;
    while (range-- > 0) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 1 || nx >= COLNO || ny < 0 || ny >= ROWNO) break;
        const loc = game.level?.at?.(nx, ny);
        if (!loc) break;
        const typ = loc.typ ?? 0;
        const closed = IS_DOOR(typ) && ((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
        // C bhit: if (!ZAP_POS(typ) || closed_door) { bhitpos -= dir; break; }
        if (!ZAP_POS(typ) || closed) break;
        x = nx;
        y = ny;
        // C bhit THROWN_WEAPON: stop on monster
        const mon = m_at(x, y);
        if (mon) {
            hitmon = mon;
            break;
        }
    }
    if (hitmon) {
        if (await thitmonst(hitmon, obj)) return;
        // miss / not consumed — fall through to place at mon cell
        x = hitmon.mx;
        y = hitmon.my;
    }
    const loc = game.level?.at?.(x, y);
    if (loc && !IS_SOFT(loc.typ) && breaktest(obj)) {
        // Broken — darts usually survive via obj_resists
        return;
    }
    place_object(obj, x, y);
    // C: throwit → stackobj after place_object
    stackobj(obj);
    // C dothrow.c throwit: if (cansee(bhitpos)) newsym — land glyph
    if (cansee(x, y)) newsym(x, y);
}


/**
 * C ref: cmd.c show_direction_keys — hjkl/yubn grid for help_dir.
 * @param {boolean} nodiag grid-bug form (orthogonal only)
 */
function show_direction_keys_lines(nodiag) {
    if (nodiag) {
        return [
            '             k   ',
            '             |   ',
            '          h- . -l',
            '             |   ',
            '             j   ',
        ];
    }
    return [
        '          y  k  u',
        '           \\ | / ',
        '          h- . -l',
        '           / | \\ ',
        '          b  j  n',
    ];
}

/**
 * C ref: cmd.c help_dir — NHW_TEXT cmdassist for invalid getdir / '?'.
 * C tty: display_nhwindow TEXT is blocking; dmore → xwaitforspace(quitchars)
 * so only space/CR/LF/ESC dismiss — other keys bell and keep waiting.
 * Returns true if shown.
 * Prefix-key / ^letter Guidebook branches deferred.
 */
async function help_dir(msg) {
    const disp = game.nhDisplay;
    if (!disp) return false;

    const lines = [];
    if (msg) {
        lines.push(`cmdassist: ${msg}`);
        lines.push('');
    }
    lines.push('Valid direction keys are:');
    lines.push(...show_direction_keys_lines(false));
    lines.push('');
    lines.push('          <  up');
    lines.push('          >  down');
    lines.push('          .  direct at yourself');
    if (msg) {
        lines.push('');
        lines.push('(Suppress this message with !cmdassist in config file.)');
    }
    while (lines.length < 24) lines.push('');
    lines[23] = '--More--';

    // C: process_text_window fullscreen (offx==0) — clear map/status
    disp.clearScreen();
    game._menu_overlay = true;
    game._pending_message = '';
    for (let r = 0; r < 24; r++) {
        const text = lines[r] || '';
        for (let i = 0; i < text.length && i < disp.cols; i++)
            disp.setCell(i, r, text[i], NO_COLOR, 0);
    }
    disp.setCursor(8, 23);
    await flush_screen(1);
    // C: xwaitforspace(quitchars) — space/CR/LF/ESC only; else bell+retry
    for (;;) {
        const k = await nhgetch();
        if (k === 27 || k === 32 || k === 13 || k === 10) break;
        // tty_nhbell — no-op in this port
    }
    game._menu_overlay = false;
    await docrt();
    return true;
}

/**
 * C ref: cmd.c getdir via yn_function + help_dir.
 * Esc / '.' / space / return cancel. '?' shows help and retries.
 * Other invalid keys: cmdassist NHW_TEXT then return cancel (no retry).
 * Returns {dx,dy} or null.
 */
export async function getdir_cmdassist(prompt) {
    // C ref: cmd.c yn_function — flush pending topline --More-- before prompt
    await flush_topl_more();
    // C: tty_yn_function — Sprintf(prompt, "%s ", query)
    const base = prompt || 'In what direction?';
    const msg = base.endsWith(' ') ? base : `${base} `;
    for (;;) {
        game._pending_message = msg;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(msg.length, 0);
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        game._pending_message = '';
        // C: quitchars + getdir self ('.') cancel without help
        if (key === 27 || ch === '.' || ch === ' ' || ch === '\n' || ch === '\r')
            return null;
        // C: movecmd(dirsym, MV_ANY) — walk/run/rush all ok
        const dir = dir_from_key(key, ch);
        if (dir) return dir;
        // C: NHKF_GETDIR_HELP '?' → help_dir then retry
        if (ch === '?') {
            await help_dir(null);
            continue;
        }
        // C: iflags.cmdassist → help_dir("Invalid direction key!") then return 0
        if (game.flags?.cmdassist !== false) {
            await help_dir('Invalid direction key!');
        } else {
            await pline('What a strange direction!');
        }
        return null;
    }
}

/**
 * C ref: dothrow.c dofire — quivered ammo; fireassist swap; getdir.
 * Autoquiver / doquiver_core / polearm / find_launcher canned wield deferred.
 * @returns {number} 0 no turn (OK/cancel), 1 took time
 */
export async function dofire() {
    let obj = game.u?.uquiver || null;

    // C: iflags.fireassist default On — swap launcher from uswapwep then retry
    if (obj && is_ammo(obj) && game.flags?.fireassist !== false) {
        const uwep = game.u?.uwep || null;
        const uswap = game.u?.uswapwep || null;
        if (ammo_and_launcher(obj, uwep)) {
            // ready to fire
        } else if (ammo_and_launcher(obj, uswap)) {
            cmdq_add_ec(doswapweapon);
            cmdq_add_ec(dofire);
            return 0; // ECMD_OK — canned swap+fire; no time yet
        }
        // find_launcher / polearm fireassist deferred
    }

    if (!obj) {
        // C: !autoquiver → You("have no ammunition readied.") then
        // doquiver_core("fire"); autoquiver/polearm/bullwhip/swap deferred.
        if (!game.flags?.autoquiver) {
            await pline('You have no ammunition readied.');
            // C getobj uses yn_function which more()s on NEED_MORE. Session
            // keystream has invent letter immediately after `f` (no dismiss).
            // mark_topline_seen ≡ tty_nhgetch NEED_MORE→NON_EMPTY so getobj
            // can read the letter (D-0484).
            mark_topline_seen();
        }
        const res = await doquiver_core('fire');
        // C: ECMD_OK / ECMD_TIME continue; other → return. JS uses 0/1.
        if (res !== 0 && res !== 1) return res;
        obj = game.u?.uquiver || null;
        if (!obj) return res | 0;
        // C: ready pline may leave NEED_MORE; tty_nhgetch/getdir yn_function
        // does not More-eat the next direction/cancel keys when the prompt
        // replaces the message. Without this, flush_topl_more eats `=/\r`
        // and capital `H` is misread as getdir (D-0485 / D-0484 pattern).
        mark_topline_seen();
    }
    // C: post-quiver fireassist launcher swap deferred for non-ammo
    const dir = await getdir_cmdassist('In what direction?');
    if (!dir) return 0;
    game.u.dx = dir.dx;
    game.u.dy = dir.dy;
    game.u.dz = 0;
    return await throw_obj(obj, 0);
}

export async function dothrow() {
    const obj = await getobj_throw();
    if (!obj) return 0;

    const dir = await getdir('In what direction? ');
    if (!dir) return 0;
    game.u.dx = dir.dx;
    game.u.dy = dir.dy;
    game.u.dz = 0;

    return await throw_obj(obj, 0);
}
