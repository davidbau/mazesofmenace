// weapon.js — C ref: weapon.c.
import { Monnam, mon_nam } from './do_name.js';
import { menucolor_row } from './coloratt.js';
import { is_ammo } from './cmd.js';
import { build_window_screen, menu_search_case, menu_search_docorner } from './com_pager.js';
import { ECMD_OK, OBJ_INVENT, OBJ_MINVENT, P_ATTACK_SPELL, P_BARE_HANDED_COMBAT, P_BASIC, P_CLERIC_SPELL, P_DIVINATION_SPELL, P_ENCHANTMENT_SPELL, P_ESCAPE_SPELL, P_EXPERT, P_FIRST_H_TO_H, P_FIRST_SPELL, P_FIRST_WEAPON, P_HEALING_SPELL, P_ISRESTRICTED, P_LAST_H_TO_H, P_LAST_SPELL, P_LAST_WEAPON, P_MATTER_SPELL, P_NONE, P_NUM_SKILLS, P_RIDING, P_SKILL_LIMIT, P_UNSKILLED } from './const.js';
import { docorner_blank_utf8_captures, docrt, flush_screen, force_more, status_r1_menu_docrt } from './display.js';
import { yn_function } from './cmd.js';
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { impossible as skill_impossible, pline, pline_mon, You_feel } from './pline.js';
import { PM_PONY } from './pm.generated.js';
import { P_NAME, P_SKILL, ROLE_CLERIC, ROLE_HEALER, ROLE_MONK, ROLE_WIZARD, SKILLS_FOR_ROLE, skillrow } from './skills.js';
import { skill_based_spellbook_id } from './spell.js';
import { menu_heading_text } from './tty_menu.js';
import './uhitm.js';
import { THIT_OBJ_MINVENT, Your, is_wet_towel } from './cmd.js'; // relocate-fns
import { W_RINGL as W_RINGL_TO, W_RINGR as W_RINGR_TO } from './const.js'; // relocate-fns
import { canseemon } from './display.js'; // relocate-fns
import { xname } from './objnam.js'; // relocate-fns
import { update_inventory } from './invent.js'; // relocate-fns
import { s_suffix } from './hacklib.js'; // relocate-fns
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js'; // relocate-fns
import { Yobjnam2, vtense } from './objnam.js'; // relocate-fns
import { OBJ_FREE } from './const.js'; // relocate-fns
import { newsym } from './display.js'; // relocate-fns
import { AT_WEAP, NEED_WEAPON$ } from './dogmove.js'; // relocate-fns
import { stackobj } from './invent.js';
import { place_object } from './mkobj.js'; // relocate-fns
import { attacktype } from './mondata.js'; // relocate-fns
import { distant_name, doname } from './objnam.js'; // relocate-fns
import './uhitm.js'; // relocate-fns
import { cansee } from './vision.js'; // relocate-fns
import { mwelded as mwelded_dm } from './wield.js'; // relocate-fns
import { rn2 } from './rnd.js'; // relocate-fns
import { flooreffects } from './do.js';
import { bypass_obj } from './worn.js';
import { ARMOR_DATA } from './armor_data.js'; // relocate-fns
import { artifact_light, is_art, shade_glare, spec_abon, spec_dbon, touch_artifact as touch_artifact_real } from './artifact.js'; // relocate-fns
import { acurr } from './attrib.js'; // relocate-fns
import { mbodypart } from './cmd.js';
import { handle_tip } from './hack.js'; // relocate-fns
import { A_DEX, A_STR, HAND, P_BOW, P_CROSSBOW, P_FLAIL, P_PICK_AXE, P_SKILLED, P_SLING, P_TWO_WEAPON_COMBAT, STR18, TIP_ENHANCE, Upolyd, W_ARM, W_ARMC, W_ARMG, W_ARMU, W_RINGL, W_RINGR } from './const.js'; // relocate-fns
import { _MONS } from './dogmove.js'; // relocate-fns
import { wizard } from './gstate.js'; // relocate-fns
import { dist2 } from './hacklib.js'; // relocate-fns
import { arti_light_description } from './light.js'; // relocate-fns
import { is_pool as is_pool_uh } from './look.js'; // relocate-fns
import { levelDifficulty } from './makemon.js'; // relocate-fns
import { is_weptool } from './mhitm.js'; // relocate-fns
import { mhis_mon } from './mhitu.js'; // relocate-fns
import { MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js'; // relocate-fns
import { can_touch_safely } from './mon.js'; // relocate-fns
import { mon_hates_blessings, mon_hates_silver } from './mondata.js'; // relocate-fns
import { m_carrying } from './mthrowu.js'; // relocate-fns
import { getObjName } from './o_init.js'; // relocate-fns
import { The, Tobjnam as Tobjnam_sh, Yname2, makeplural, makesingular, otense, the as the_sh } from './objnam.js'; // relocate-fns
import { OC_NAME } from './oc_name_data.js'; // relocate-fns
import { PM_BALROG, PM_SHADE } from './pm.generated.js'; // relocate-fns
import { d, rnd } from './rnd.js'; // relocate-fns
import { impossible } from './steed.js'; // relocate-fns
import { begin_burn, end_burn } from './timeout.js'; // relocate-fns
import { ARMOR_CLASS, GEM_CLASS, M1_WALLWALK_UH, MZ_LARGE, OCLASS_WEAPON_SH, SHADE_GLARE_SILVER_MAT, S_EEL_UH, S_SNAKE_UH, TOOL_CLASS, WEAPON_CLASS, WEAPON_WLDAM, WEAPON_WSDAM, W_WEP, You_feel_uh, _uh_martial_bonus, is_axe_dv, sh_oc_bimanual, sh_resists_ston, sr_MON_WEP, sr_is_animal, sr_mindless, sr_oc_material, sr_oc_skill, sr_touch_petrifies, thick_skinned } from './uhitm.js'; // relocate-fns
import { couldsee } from './vision.js'; // relocate-fns
import { mwelded } from './wield.js'; // relocate-fns
import { which_armor } from './worn.js'; // relocate-fns

const NO_WEAPON_WANTED$ = 0;
const STRANGE_OBJECT = 0; /* onames.h:1 */
const SILVER = 14; /* objclass.h:27 */
const plur = (n) => (n | 0) === 1 ? '' : 's';
const add_menu_str = (items, str) => items.push({ text: str, heading: false, a_int: 0 });
const carried = (obj) => (obj?.where | 0) === OBJ_INVENT;
const mcarried = (obj) => (obj?.where | 0) === OBJ_MINVENT;

function P_MAX_SKILL(t) { return skillrow(t).max_skill | 0; }

function P_ADVANCE(t) { return skillrow(t).advance | 0; }

function P_RESTRICTED(t) { return P_SKILL(t) === P_ISRESTRICTED; }

/* C ref: skills.h practice_needed_to_advance(level) — ((level) * (level) * 20) */
function practice_needed_to_advance(level) { return level * level * 20; }

/* C ref: weapon.c:1170 could_advance(). */
function could_advance(skill) {
    if (P_RESTRICTED(skill)
        || P_SKILL(skill) >= P_MAX_SKILL(skill)
        || (game.u.skills_advanced | 0) >= P_SKILL_LIMIT)
        return false;
    return P_ADVANCE(skill) >= practice_needed_to_advance(P_SKILL(skill));
}

/* C ref: weapon.c:1186 peaked_skill(). */
function peaked_skill(skill) {
    if (P_RESTRICTED(skill))
        return false;
    return P_SKILL(skill) >= P_MAX_SKILL(skill)
        && P_ADVANCE(skill) >= practice_needed_to_advance(P_SKILL(skill));
}

/* C ref: weapon.c:1198 skill_advance().  Caller has already checked
 * can_advance(); this is the state change plus its message. */
async function skill_advance(skill) {
    const u = game.u;
    u.weapon_slots = (u.weapon_slots | 0) - slots_required(skill);
    skillrow(skill).skill = P_SKILL(skill) + 1;
    u.skill_record = u.skill_record || [];
    u.skill_record[(u.skills_advanced | 0)] = skill;
    u.skills_advanced = (u.skills_advanced | 0) + 1;
    /* subtly change the advance message to indicate no more advancement */
    const msg = `You are now ${P_SKILL(skill) >= P_MAX_SKILL(skill) ? 'most' : 'more'} skilled in ${P_NAME(skill)}.`;
    await pline(msg);
    if (skill >= P_FIRST_SPELL && skill <= P_LAST_SPELL)
        skill_based_spellbook_id();
    return msg;
}

/* C ref: weapon.c:1425 unrestrict_weapon_skill(). */
export function unrestrict_weapon_skill(skill) {
    if (skill < P_NUM_SKILLS && P_RESTRICTED(skill)) {
        const r = skillrow(skill);
        r.skill = P_UNSKILLED;
        r.max_skill = P_BASIC;
        r.advance = 0;
    }
}

/* C ref: role.c roles[].spelspec, resolved through spell_skilltype() =
 * objects[booktype].oc_skill (spell.c:2044).  Indexed by flags.initrole:
 *   Arc magic mapping->divination   Bar haste self->escape
 *   Cav dig->matter                 Hea cure sickness->healing
 *   Kni turn undead->clerical       Mon restore ability->healing
 *   Pri remove curse->clerical      Rog detect treasure->divination
 *   Ran invisibility->escape        Sam clairvoyance->divination
 *   Tou charm monster->enchantment  Val cone of cold->attack
 *   Wiz magic missile->attack                                             */
const ROLE_SPELSPEC_SKILL = [
    P_DIVINATION_SPELL, P_ESCAPE_SPELL, P_MATTER_SPELL, P_HEALING_SPELL,
    P_CLERIC_SPELL, P_HEALING_SPELL, P_CLERIC_SPELL, P_DIVINATION_SPELL,
    P_ESCAPE_SPELL, P_DIVINATION_SPELL, P_ENCHANTMENT_SPELL, P_ATTACK_SPELL,
    P_ATTACK_SPELL,
];

/* C ref: weapon.c:1738 skill_init(class_skill).  Called from u_init(), after
 * ini_inv() has built gi.invent (C u_init.c:1404). */
export async function skill_init(initrole) {
    const u = game.u;
    const ir = initrole | 0;

    /* initialize skill array; by default, everything is restricted */
    u.weapon_skills = [];
    for (let skill = 0; skill < P_NUM_SKILLS; skill++)
        u.weapon_skills[skill] = { skill: P_ISRESTRICTED, max_skill: P_ISRESTRICTED, advance: 0 };

    /* Set skill for all weapons in inventory to be basic */
    for (let obj = game.invent; obj; obj = obj.nobj) {
        /* don't give skill just because of carried ammo, wait until we see
           the relevant launcher */
        if (is_ammo(obj))
            continue;
        const skill = weapon_type(obj);
        if (skill !== P_NONE)
            skillrow(skill).skill = P_BASIC;
    }

    /* set skills for magic */
    if (ir === ROLE_HEALER || ir === ROLE_MONK) {
        skillrow(P_HEALING_SPELL).skill = P_BASIC;
    } else if (ir === ROLE_CLERIC) {
        skillrow(P_CLERIC_SPELL).skill = P_BASIC;
    } else if (ir === ROLE_WIZARD) {
        skillrow(P_ATTACK_SPELL).skill = P_BASIC;
        skillrow(P_ENCHANTMENT_SPELL).skill = P_BASIC;
    }

    /* walk through array to set skill maximums */
    const table = SKILLS_FOR_ROLE[ir];
    if (!table)
        return;
    for (const [skill, skmax] of table) {
        skillrow(skill).max_skill = skmax;
        if (P_SKILL(skill) === P_ISRESTRICTED) /* skill pre-set */
            skillrow(skill).skill = P_UNSKILLED;
    }

    /* High potential fighters already know how to use their hands. */
    if (P_MAX_SKILL(P_BARE_HANDED_COMBAT) > P_EXPERT)
        skillrow(P_BARE_HANDED_COMBAT).skill = P_BASIC;

    /* Roles that start with a horse know how to ride it. */
    if (game.urole.petnum === PM_PONY)
        skillrow(P_RIDING).skill = P_BASIC;

    /* Make sure we haven't missed setting the max on a skill & set advance */
    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        if (!P_RESTRICTED(skill)) {
            if (P_MAX_SKILL(skill) < P_SKILL(skill)) {
                await skill_impossible("skill_init: curr > max: %s", P_NAME(skill));
                skillrow(skill).max_skill = P_SKILL(skill);
            }
            skillrow(skill).advance = practice_needed_to_advance(P_SKILL(skill) - 1);
        }
    }

    /* each role has a special spell; allow at least basic for its type */
    unrestrict_weapon_skill(ROLE_SPELSPEC_SKILL[ir]);
    if (!u.uroleplay?.pauper)
        skill_based_spellbook_id();
}

/* C ref: weapon.c:1226-1231 skill_ranges[]. */
const SKILL_RANGES = [
    { first: P_FIRST_H_TO_H, last: P_LAST_H_TO_H, name: 'Fighting Skills' },
    { first: P_FIRST_WEAPON, last: P_LAST_WEAPON, name: 'Weapon Skills' },
    { first: P_FIRST_SPELL, last: P_LAST_SPELL, name: 'Spellcasting Skills' },
];

const pad = (s, n) => (String(s) + ' '.repeat(Math.max(0, n - String(s).length)));

const rpad = (n, w) => String(n).padStart(w);

/* C ref: weapon.c:1230 add_skills_to_menu(win, selectable, speedy).  Returns
 * the menu items in C's add_menu order: { text, heading, a_int }.  a_int 0 is
 * a non-selectable row (heading or unadvanceable skill). */
function add_skills_to_menu(selectable, speedy) {
    const out = [];
    /* Find the longest skill name. */
    let longest = 0;
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        if (P_RESTRICTED(i))
            continue;
        const len = P_NAME(i).length;
        if (len > longest)
            longest = len;
    }
    for (const range of SKILL_RANGES) {
        for (let i = range.first; i <= range.last; i++) {
            /* Print headings for skill types (BEFORE the restricted skip, so a
               fully-restricted range still gets its heading). */
            if (i === range.first)
                out.push({ text: range.name, heading: true, a_int: 0 });
            if (P_RESTRICTED(i))
                continue;
            /*
             * The 12 is the longest skill level name.
             * The "    " is room for a selection letter and dash, "a - ".
             */
            let prefix;
            if (!selectable)
                prefix = '';
            else if (can_advance(i, speedy))
                prefix = ''; /* will be preceded by menu choice */
            else if (could_advance(i))
                prefix = '  * ';
            else if (peaked_skill(i))
                prefix = '  # ';
            else
                prefix = '    ';
            const sklnam = skill_level_name(i);
            let text;
            const tabsep = !!game.iflags?.menu_tab_sep;
            if (wizardMode() && tabsep) {
                /* " %s%s\t%s\t%5d(%4d)" */
                text = ` ${prefix}${P_NAME(i)}\t${sklnam}\t`
                     + `${rpad(P_ADVANCE(i), 5)}(${rpad(practice_needed_to_advance(P_SKILL(i)), 4)})`;
            } else if (tabsep && !wizardMode()) {
                /* " %s%s\t[%s]" */
                text = ` ${prefix}${P_NAME(i)}\t[${sklnam}]`;
            } else if (wizardMode()) {
                /* " %s%-*s %-12s %5d(%4d)" */
                text = ` ${prefix}${pad(P_NAME(i), longest)} ${pad(sklnam, 12)} `
                     + `${rpad(P_ADVANCE(i), 5)}(${rpad(practice_needed_to_advance(P_SKILL(i)), 4)})`;
            } else {
                /* " %s %-*s [%s]" */
                text = ` ${prefix} ${pad(P_NAME(i), longest)} [${sklnam}]`;
            }
            out.push({ text, heading: false,
                       a_int: (selectable && can_advance(i, speedy)) ? i + 1 : 0 });
        }
    }
    return out;
}

function wizardMode() { return !!(game.flags && game.flags.debug); }

/* C ref: hack.h y_n(query) => yn_function(query, ynchars, 'n', TRUE); tty
 * rejects keys outside "yn"/ESC/space/Enter with a bell and keeps reading. */
async function y_n(question) {
    return yn_function(question, 'yn', 'n', true);
}

const SCREEN_ROWS = 24;

/* C ref: win/tty/wintty.c tty_end_menu + process_menu_window, for a menu whose
 * widest line drives offx down to 10 and therefore to 0 (full-screen mode).
 * The #enhance menu is always full-screen: its wizard-mode rows are ~48
 * columns and its non-wizard rows ~40, and `len = strlen(str) + 2` against
 * `offx = max(10, cols - maxcol - 1)` lands at or below 10 in both shapes, so
 * `if (cw->offx == 10 ...) { cw->offx = 0; term_clear_screen(); }` fires.
 *
 * Page geometry: lmax = min(52, rows - 1) = 23 items per page; the morestr row
 * follows the last item of the page.  Every printed row is `putchar(' ')`
 * followed by the item string, i.e. a one-column left margin. */
/* Geometry of the overlay window enhance_menu last left up (null: full-screen). */
let enhance_overlay = null;

async function enhance_menu(items, prompt, pickOne) {
    const g = game;
    enhance_overlay = null;
    /* C ref: tty_end_menu — "Put the prompt at the beginning of the menu":
     * add_menu("") then add_menu(prompt), both PREPENDED after the list has
     * been reversed, so the prompt row comes first and the blank row second. */
    const all = [{ text: prompt, heading: true, a_int: 0 },
                 { text: '', heading: false, a_int: 0 }, ...items];
    const LMAX = Math.min(52, SCREEN_ROWS - 1);
    const npages = Math.max(1, Math.ceil(all.length / LMAX));
    /* C ref: tty_end_menu's accelerator pass — menu_ch resets to 'a' at every
     * page boundary and only advances on items with a non-zero identifier. */
    const accel = new Array(all.length).fill('');
    let menu_ch = 'a'.charCodeAt(0);
    for (let n = 0; n < all.length; n++) {
        if ((n % LMAX) === 0)
            menu_ch = 'a'.charCodeAt(0);
        if (all[n].a_int) {
            accel[n] = String.fromCharCode(menu_ch);
            menu_ch = (menu_ch === 'z'.charCodeAt(0)) ? 'A'.charCodeAt(0) : menu_ch + 1;
        }
    }
    let pageIdx = 0;
    /* C ref: wintty.c:1927 — a single-page menu with maxrow < rows overlays the
     * map at offx = min(40, cols - maxcol - 1) (H2344_BROKEN arm), maxcol being
     * the longest stored str + 2 (tty_end_menu, trailing blanks counted); only
     * offx == 10 / maxrow >= rows goes full-screen.  Same placement as
     * cmd.js tty_menu_pick_one_ext. */
    let overlayCol = 0, overlayRows = 0;
    if (npages === 1 && all.length + 1 < SCREEN_ROWS) {
        let maxlen = 5;
        for (let n = 0; n < all.length; n++) {
            const body = accel[n] ? `${accel[n]} - ${all[n].text}` : all[n].text;
            maxlen = Math.max(maxlen, body.length);
        }
        const col = Math.min(41, 78 - maxlen);
        if (col > 1)
            overlayCol = col;
    }
    const renderPage = async () => {
        const start = pageIdx * LMAX;
        const page = all.slice(start, start + LMAX);
        const morestr = (npages > 1) ? `(${pageIdx + 1} of ${npages})` : '(end) ';
        if (overlayCol) {
            const wl = page.map((it, i) => {
                const a = accel[start + i];
                const body = (a ? `${a} - ${it.text}` : it.text).replace(/\t/g, ' ');
                return it.heading ? menu_heading_text(body) : menucolor_row(body);
            });
            wl.push('(end)');
            overlayRows = wl.length;
            g._screen_output = build_window_screen(wl, overlayCol, g.u?.uac ?? 0);
            const disp = g.nhDisplay;
            if (disp) { disp.cursorCol = overlayCol + '(end) '.length; disp.cursorRow = page.length; }
            return { start, page, morestr };
        }
        const rows = new Array(SCREEN_ROWS).fill('');
        for (let i = 0; i < page.length; i++) {
            const it = page[i];
            const a = accel[start + i];
            const body = (a ? `${a} - ${it.text}` : it.text).replace(/\t/g, ' ');
            /* Headings are drawn with iflags.menu_headings (wintty.c:2688). */
            rows[i] = ' ' + (it.heading ? menu_heading_text(body) : menucolor_row(body)); /* windows.c:1803 add_menu */
        }
        rows[page.length] = ` ${morestr}`;
        g._screen_output = rows.join('\n');
        const disp = g.nhDisplay;
        if (disp) { disp.cursorCol = 1 + morestr.length; disp.cursorRow = page.length; }
        return { start, page, morestr };
    };
    let cur = await renderPage();
    if (overlayCol) enhance_overlay = { col: overlayCol, rows: overlayRows };
    let counting = false, count = 0, resetCount = true, countState = null;
    for (;;) {
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        countState = [counting, count, resetCount];
        if (resetCount) {
            counting = false;
            count = 0;
        } else {
            resetCount = true;
        }
        if (ch >= '0' && ch <= '9') {
            count = Math.min(count * 10 + (key - 48), 0x7fffffff);
            if (count !== 0) {
                counting = true;
                resetCount = false;
            }
            continue;
        }
        if (key === 27) { /* ESC — cancel, or just stop a count */
            if (counting)
                continue;
            return 0;
        }
        if (key === 32 /* ' ' */ || ch === '>') {
            if (pageIdx < npages - 1) { pageIdx++; cur = await renderPage(); continue; }
            if (key === 32) return 0; /* ' ' finishes on the last page */
            continue;
        }
        if (ch === '<' || ch === '^' || ch === '|') {
            const target = (ch === '<') ? pageIdx - 1 : (ch === '^') ? 0 : npages - 1;
            if (target !== pageIdx && target >= 0 && target < npages) {
                pageIdx = target; cur = await renderPage();
            }
            continue;
        }
        if (ch === '\n' || ch === '\r') /* finished, nothing selected */
            return 0;
        if (ch === ':' && pickOne) {
            /* C wintty.c:1700-1730: search all selectable entries in mlist
             * order, including pages other than the one currently displayed. */
            const rows = g._screen_output.split('\n');
            let picked = 0;
            const finished = await menu_search_case('ONE',
                all.flatMap((it, i) => it.a_int
                    ? [{ str: `${accel[i]} - ${it.text}`, a_int: it.a_int }] : []),
                () => rows, (it) => { picked = it.a_int; });
            if (finished) return picked;
            /* getline.c:213 clears WIN_MESSAGE; process_menu_window leaves
             * the erased title blank until a page change repaints the menu. */
            rows[0] = '';
            g._screen_output = menu_search_docorner(rows).join('\n');
            const disp = g.nhDisplay;
            if (disp) {
                disp.cursorCol = (overlayCol || 1) + cur.morestr.length;
                disp.cursorRow = cur.page.length;
            }
            continue;
        }
        if (pickOne) {
            const idx = cur.page.findIndex((it, i) => accel[cur.start + i] === ch && it.a_int);
            if (idx >= 0)
                return cur.page[idx].a_int;
        }
        /* Unrecognised key: bell, no redraw, read again.  C's xwaitforspace
         * (wintty.c:1558) swallows it before the loop top, so the count state
         * is untouched. */
        [counting, count, resetCount] = countState;
    }
}

/* C ref: weapon.c:1329 enhance_weapon_skill() — the `#enhance' command. */
export async function enhance_weapon_skill() {
    const g = game;
    const u = g.u;
    let speedy = false;
    let n = 0;

    /* C ref: weapon.c:1338 `svc.context.tips |= (1 << TIP_ENHANCE)` — "player
     * knows about #enhance, don't show tip anymore".  This port models
     * context.tips as a PER-TIP BOOLEAN ARRAY rather than C's bitmask (see
     * js/cmd.js handle_tip, which indexes it), so set the TIP_ENHANCE slot in
     * that representation; writing C's bitmask here turns the array into a
     * number and handle_tip then throws on its next index write. */
    const TIP_ENHANCE = 0; /* context.h:15 */
    g.context = g.context || {};
    if (!g.context.tips)
        g.context.tips = [];
    g.context.tips[TIP_ENHANCE] = true;

    if (wizardMode() && (await y_n('Advance skills without practice?')) === 'y')
        speedy = true;

    let pendingMore = null;
    do {
        /* C ref: weapon.c:1357 create_nhwindow/start_menu -> the tty's
         * tty_display_nhwindow, which flushes an unacknowledged topline first
         * (`if (ttyDisplay->toplin == TOPLINE_NEED_MORE) tty_display_nhwindow(
         * WIN_MESSAGE, TRUE)`).  That is where the "--More--" after each
         * advance message comes from: it belongs to the NEXT menu's display,
         * not to skill_advance, so a loop that ends instead of redisplaying
         * leaves the message unpaged. */
        if (pendingMore !== null) {
            await force_more(pendingMore);
            pendingMore = null;
        }
        /* count advanceable skills */
        let to_advance = 0, eventually_advance = 0, maxxed_cnt = 0;
        for (let i = 0; i < P_NUM_SKILLS; i++) {
            if (P_RESTRICTED(i))
                continue;
            if (can_advance(i, speedy))
                to_advance++;
            else if (could_advance(i))
                eventually_advance++;
            else if (peaked_skill(i))
                maxxed_cnt++;
        }

        const items = [];
        /* C weapon.c:1363-1377: start with a legend if any entries will be annotated with "*"/"#" */
        if (eventually_advance > 0 || maxxed_cnt > 0) {
            if (eventually_advance > 0) {
                const MAXULEV = 30;
                add_menu_str(items, `(Skill${plur(eventually_advance)} flagged by "*" may be enhanced `
                    + `${(u.ulevel | 0) < MAXULEV ? "when you're more experienced"
                                                  : 'if skill slots become available'}.)`);
            }
            /* C weapon.c:1371-1376: if (maxxed_cnt > 0) */
            if (maxxed_cnt > 0) {
                add_menu_str(items, `(Skill${plur(maxxed_cnt)} flagged by "#" cannot be enhanced any further.)`);
            }
            add_menu_str(items, '');
        }

        items.push(...add_skills_to_menu(
            to_advance + eventually_advance + maxxed_cnt > 0, speedy));

        let prompt = (to_advance > 0) ? 'Pick a skill to advance:' : 'Current skills:';
        if (wizardMode() && !speedy) {
            const slots = u.weapon_slots | 0;
            prompt += `  (${slots} slot${plur(slots)} available)`;
        }
        const picked = await enhance_menu(items, prompt, to_advance > 0);
        /* C ref: weapon.c:1390 destroy_nhwindow(win).  The #enhance menu is a
         * full-screen (offx == 0) tty window, so tearing it down repaints the
         * map — C's term_clear_screen()/docrt() pair. */
        if (enhance_overlay) {
            /* An overlay (offx > 0) window is dismissed by docorner(), not
             * docrt(): wintty.c:982,3684 clears and repaints only from offx
             * on, so cells left of it (warning glyphs, never remembered)
             * stay on the physical screen. */
            docorner_blank_utf8_captures(enhance_overlay.col - 1, enhance_overlay.rows + 1);
            await flush_screen(1);
        } else {
            /* windows.c:1861 select_menu runs with bot_disabled, and
             * tty_select_menu's tty_dismiss_nhwindow -> erase_menu_or_text
             * (wintty.c:978-979) does docrt(); flush_screen(1): the map, row
             * y=20 included, prints while bot() returns early (botl.c:255).
             * The next bot() then rewrites status row 1 over it -- the same
             * ordering tty_menu.js and cmd.js _dismissMenu record. */
            await docrt();
            status_r1_menu_docrt();
            game._r1botAfterMap = game.level;
            game._r1textOver = true;
        }
        n = picked ? 1 : 0;
        if (n > 0) {
            pendingMore = await skill_advance(picked - 1); /* get item selected */
            /* check for more skills able to advance; if so, then... */
            n = 0;
            for (let i = 0; i < P_NUM_SKILLS; i++) {
                if (can_advance(i, speedy)) {
                    if (!speedy)
                        await You_feel('you could be more dangerous!');
                    n++;
                    break;
                }
            }
        }
    } while (speedy && n > 0);
    return ECMD_OK;
}

/* C weapon.c:435-468: feedback for silver rings in polymorphed attacks. */
export async function silver_sears(magr, mdef, silverhit) {
    const { uleft, uright } = game.u;
    const ltyp = uleft && (silverhit & W_RINGL_TO) ? uleft.otyp : STRANGE_OBJECT;
    const rtyp = uright && (silverhit & W_RINGR_TO) ? uright.otyp : STRANGE_OBJECT;
    const l_dknown = !!(uleft && uleft.dknown);
    const r_dknown = !!(uright && uright.dknown);
    const l_ag = MKOBJ_OC_MATERIAL[ltyp] === SILVER && l_dknown;
    const r_ag = MKOBJ_OC_MATERIAL[rtyp] === SILVER && r_dknown;
    if (silverhit & (W_RINGL_TO | W_RINGR_TO)) {
        const both = (ltyp === rtyp && l_dknown === r_dknown) || (l_ag && r_ag);
        const rings = both ? 'rings' : 'ring';
        const prefix = (l_ag || r_ag) ? 'silver ' : both ? ''
            : (silverhit & W_RINGL_TO) ? 'left ' : 'right ';
        await Your('%s%s %s %s!', prefix, rings, vtense(rings, 'sear'), mon_nam(mdef));
    }
}

/* C ref: weapon.c:1019-1033 finish_towel_change(obj, newspe) — shared tail of
 * wet_a_towel/dry_a_towel, using the shared inventory refresh. */
function finish_towel_change(obj, newspe) {
    newspe = Math.min(newspe, 7);
    obj.spe = Math.max(newspe, 0);
    const u = game.u || {};
    if (obj === u.uwep)
        game.unweapon = !is_wet_towel(obj);
    if (carried(obj))
        update_inventory();
}

/* C ref: weapon.c:1066-1085 dry_a_towel(obj, amt, verbose).  amt<0: decrement
 * by abs(amt); amt>=0: new value. */
export async function dry_a_towel(obj, amt, verbose) {
    const newspe = (amt < 0) ? (obj.spe | 0) + amt : amt;
    if (newspe < (obj.spe | 0)) {
        if (verbose) {
            // C weapon.c:1078-1084: hero feedback or visible monster feedback.
            if (carried(obj))
                await pline(`${Yobjnam2(obj, null)} dries${!newspe ? ' out' : ''}.`);
            else if (mcarried(obj) && canseemon(obj.ocarry))
                await pline(`${s_suffix(Monnam(obj.ocarry))} ${xname(obj)} dries${!newspe ? ' out' : ''}.`);
        }
    }
    if (newspe !== (obj.spe | 0))
        finish_towel_change(obj, newspe);
}

// C ref: weapon.c:950 abon(void) — strength & dexterity attack bonus.  The
// one port lives in js/uhitm.js; it carries the Upolyd arm (weapon.c:955-956,
// adj_lev(&mons[u.umonnum]) - 3) that this file's former private copy omitted,
// so a polymorphed hero's dig effort used the natural-form Str/Dex ladder.

export async function possibly_unwield(magr, polyspot) {
    const obj = magr?.mw;
    if (!obj)
        return;
    let prev = null, cur = magr.minvent;
    while (cur && cur !== obj) {
        prev = cur;
        cur = cur.nobj;
    }
    if (!cur) {
        magr.mw = null;
        magr.weapon_check = NEED_WEAPON$;
        return;
    }
    /* A monster that no longer has an AT_WEAP attack must drop its weapon
     * immediately; otherwise C leaves the old weapon in place until the next
     * weapon-selection pass. */
    if (!attacktype(magr.data, AT_WEAP)) {
        setmnotwielded(magr, obj);
        magr.weapon_check = NO_WEAPON_WANTED$;
        if (cansee(magr.mx | 0, magr.my | 0)) {
            await pline_mon(magr, `${Monnam(magr)} drops ${(await distant_name(obj, doname))}.`);
            newsym(magr.mx | 0, magr.my | 0);
        }
        if (prev) prev.nobj = cur.nobj;
        else magr.minvent = cur.nobj;
        cur.nobj = null;
        cur.where = OBJ_FREE;
        // C weapon.c:771-776: might be dropping object into water or lava
        if (!await flooreffects(cur, magr.mx | 0, magr.my | 0, "drop")) {
            if (polyspot)
                bypass_obj(cur);
            place_object(cur, magr.mx | 0, magr.my | 0);
            await stackobj(cur);
        }
        return;
    }
    /* A weapon-capable monster keeps the object but asks mon_wield_item to
     * reconsider it after a polymorph or robbery -- unless it already learned
     * its weapon is welded (C weapon.c:792-793). */
    if (!(mwelded_dm(obj) && (magr.weapon_check | 0) === NO_WEAPON_WANTED$))
        magr.weapon_check = NEED_WEAPON$;
}

/* C ref: weapon.c:1476 drain_weapon_skill(int n) — drain n random advanced
 * skills, refund their slots, and reduce their accumulated practice. */
export async function drain_weapon_skill(n) {
    const g = game;
    const u = g.u || (g.u = {});
    const drained = new Set();
    while (--n >= 0) {
        const advanced = u.skills_advanced | 0;
        if (!advanced)
            continue;
        const i = rn2(advanced);
        const skill = (u.skill_record?.[i] ?? 0) | 0;
        drained.add(skill);
        if (!u.skill_record) u.skill_record = [];
        u.skill_record.splice(i, 1);
        u.skills_advanced = advanced - 1;

        const row = u.weapon_skills?.[skill];
        if (!row || (row.skill | 0) <= P_UNSKILLED)
            throw new Error(`panic: drain_weapon_skill (${skill})`);
        row.skill = (row.skill | 0) - 1;
        u.weapon_slots = (u.weapon_slots | 0) + slots_required(skill);
        const curradv = (row.skill | 0) * (row.skill | 0) * 20;
        const prevLevel = (row.skill | 0) - 1;
        const prevadv = prevLevel * prevLevel * 20;
        if ((row.advance | 0) >= curradv)
            row.advance = prevadv + rn2(curradv - prevadv);
    }
    for (const skill of [...drained].sort((a, b) => a - b)) {
        const level = u.weapon_skills?.[skill]?.skill | 0;
        await pline(`You forget ${level >= P_BASIC ? 'some of ' : ''}your training in ${P_NAME(skill)}.`);
    }
}


/* ── select_rwep: select a ranged weapon for a monster (weapon.c:532) ──
 * Object-type constants (objects.h ordering; cross-checked against
 * MKOBJ_OC_CLASS / MKOBJ_OC_SKILL). */
export const SR_ARROW = 18, SR_ELVEN_ARROW = 19, SR_ORCISH_ARROW = 20,
      SR_SILVER_ARROW = 21, SR_YA = 22, SR_CROSSBOW_BOLT = 23, SR_DART = 24,
      SR_SHURIKEN = 25, SR_SPEAR = 27, SR_ELVEN_SPEAR = 28, SR_ORCISH_SPEAR = 29,
      SR_DWARVISH_SPEAR = 30, SR_SILVER_SPEAR = 31, SR_JAVELIN = 32,
      SR_DAGGER = 34, SR_ELVEN_DAGGER = 35, SR_ORCISH_DAGGER = 36,
      SR_SILVER_DAGGER = 37, SR_KNIFE = 40,
      SR_PARTISAN = 59, SR_RANSEUR = 60, SR_SPETUM = 61, SR_GLAIVE = 62,
      SR_HALBERD = 63, SR_BARDICHE = 64, SR_VOULGE = 65, SR_FAUCHARD = 66,
      SR_GUISARME = 67, SR_BILL_GUISARME = 68, SR_LUCERN_HAMMER = 69,
      SR_BEC_DE_CORBIN = 70, SR_LANCE = 72, SR_AKLYS = 80,
      SR_BOW = 83, SR_ELVEN_BOW = 84, SR_ORCISH_BOW = 85, SR_YUMI = 86,
      SR_SLING = 87, SR_CROSSBOW = 88,
      SR_LUCKSTONE = 470, SR_LOADSTONE = 471, SR_FLINT = 473, SR_ROCK = 474,
      SR_BOULDER = 475, SR_CORPSE = 265, SR_EGG = 266,
      /* objects.h:1100 CREAM_PIE = 287; was 286 = LUMP_OF_ROYAL_JELLY */
      SR_CREAM_PIE = 287;
export const SR_GEM_CLASS = 13;
export const SR_S_KOP = 37;              /* monsym.h S_KOP */
export const SR_NON_PM = -1;
export const SR_NO_WEAPON_WANTED = 0;    /* objclass.h */
export const SR_W_ARMS = 0x00000008;     /* worn shield */
export const SR_W_WEP = 0x00000100;      /* prop.h W_WEP — wielded weapon worn mask */
export const SR_SILVER = 14;             /* objects.h SILVER material */
export const SR_ART_SNICKERSNEE = 19;    /* artilist.h index */
/* skills (skills.h) */
export const SR_P_BOW = 20, SR_P_SLING = 21, SR_P_CROSSBOW = 22;
/* monflag.h flag bits */
export const SR_M1_MINDLESS = 0x00010000, SR_M1_ANIMAL = 0x00040000;
export const SR_M2_STRONG = 0x04000000, SR_M2_ROCKTHROW = 0x08000000,
      SR_M2_JEWELS = 0x20000000;

/* weapon.c:498 rwep[] — most-potent-first ranged weapon list. */
export const SR_rwep = [
    SR_DWARVISH_SPEAR, SR_SILVER_SPEAR, SR_ELVEN_SPEAR, SR_SPEAR, SR_ORCISH_SPEAR,
    SR_JAVELIN, SR_SHURIKEN, SR_YA, SR_SILVER_ARROW, SR_ELVEN_ARROW, SR_ARROW,
    SR_ORCISH_ARROW, SR_CROSSBOW_BOLT, SR_SILVER_DAGGER, SR_ELVEN_DAGGER,
    SR_DAGGER, SR_ORCISH_DAGGER, SR_KNIFE, SR_FLINT, SR_ROCK, SR_LOADSTONE,
    SR_LUCKSTONE, SR_DART, SR_CREAM_PIE,
];
/* weapon.c:506 pwep[] — polearms. */
export const SR_pwep = [
    SR_HALBERD, SR_BARDICHE, SR_SPETUM, SR_BILL_GUISARME, SR_VOULGE, SR_RANSEUR,
    SR_GUISARME, SR_GLAIVE, SR_LUCERN_HAMMER, SR_BEC_DE_CORBIN, SR_FAUCHARD,
    SR_PARTISAN, SR_LANCE,
];
/* weapon.c:512-517 arwep[] — throw-and-return weapons. AKLYS_LIM = BOLT_LIM/2
 * = 4, range = AKLYS_LIM^2 = 16. */
export const SR_arwep = [{ otyp: SR_AKLYS, range: 16 }];
/* oc_bimanual is true for every polearm except the lance (objects.h `bi`
 * field); the aklys is not bimanual. */
export const SR_BIMANUAL = new Set([
    SR_PARTISAN, SR_RANSEUR, SR_SPETUM, SR_GLAIVE, SR_HALBERD, SR_BARDICHE,
    SR_VOULGE, SR_FAUCHARD, SR_GUISARME, SR_BILL_GUISARME, SR_LUCERN_HAMMER,
    SR_BEC_DE_CORBIN,
]);

/* ── select_hwep / mon_wield_item (weapon.c:691-933) ────────────────────────
 * The hand-to-hand half of the monster weapon code, the mirror of select_rwep
 * above and sharing its helpers (oselect, sr_MON_WEP, sr_strongmonst,
 * sr_oc_material, mwelded, m_carrying, which_armor).
 *
 * Object-type constants not already in the SR_ block; the otyp space is
 * js/o_init.js's (getObjName), cross-checked name-by-name against the
 * objects.h ordering.  PICK_AXE/UNICORN_HORN/CORPSE are TOOL/FOOD entries and
 * so are quoted from the values js/dig.js:41, js/makemon.js:1889 and
 * js/display.js:69 already use. */
export const SH_TSURUGI = 57, SH_RUNESWORD = 58, SH_DWARVISH_MATTOCK = 71,
      SH_TWO_HANDED_SWORD = 55, SH_BATTLE_AXE = 45, SH_KATANA = 56,
      SH_UNICORN_HORN = 261, SH_CRYSKNIFE = 43, SH_TRIDENT = 33,
      SH_LONG_SWORD = 54, SH_ELVEN_BROADSWORD = 53, SH_BROADSWORD = 52,
      SH_SCIMITAR = 50, SH_SILVER_SABER = 51, SH_MORNING_STAR = 75,
      SH_ELVEN_SHORT_SWORD = 47, SH_DWARVISH_SHORT_SWORD = 49,
      SH_SHORT_SWORD = 46, SH_ORCISH_SHORT_SWORD = 48, SH_SILVER_MACE = 74,
      SH_MACE = 73, SH_AXE = 44, SH_FLAIL = 81, SH_BULLWHIP = 82,
      SH_QUARTERSTAFF = 79, SH_CLUB = 77, SH_PICK_AXE = 259,
      SH_RUBBER_HOSE = 78, SH_WAR_HAMMER = 76, SH_ATHAME = 38,
      SH_SCALPEL = 39, SH_WORM_TOOTH = 42;
export const SH_W_ARMG = 0x00000010;        /* prop.h W_ARMG — worn gloves */
export const SH_M2_GIANT = 0x00002000;      /* monflag.h M2_GIANT */
/* monst.h enum wpn_chk_flags (js/const.js:2689-2696 carries the same values). */
export const SH_NO_WEAPON_WANTED = 0, SH_NEED_WEAPON = 1, SH_NEED_HTH_WEAPON = 3,
      SH_NEED_RANGED_WEAPON = 2, SH_NEED_PICK_AXE = 4, SH_NEED_AXE = 5,
      SH_NEED_PICK_OR_AXE = 6;

/* weapon.c:691-701 hwep[] — hand-to-hand weapons in order of preference. */
export const SH_hwep = [
    SR_CORPSE, /* cockatrice corpse */
    SH_TSURUGI, SH_RUNESWORD, SH_DWARVISH_MATTOCK, SH_TWO_HANDED_SWORD,
    SH_BATTLE_AXE, SH_KATANA, SH_UNICORN_HORN, SH_CRYSKNIFE, SH_TRIDENT,
    SH_LONG_SWORD, SH_ELVEN_BROADSWORD, SH_BROADSWORD, SH_SCIMITAR,
    SH_SILVER_SABER, SH_MORNING_STAR, SH_ELVEN_SHORT_SWORD,
    SH_DWARVISH_SHORT_SWORD, SH_SHORT_SWORD, SH_ORCISH_SHORT_SWORD,
    SH_SILVER_MACE, SH_MACE, SH_AXE, SR_DWARVISH_SPEAR, SR_SILVER_SPEAR,
    SR_ELVEN_SPEAR, SR_SPEAR, SR_ORCISH_SPEAR, SH_FLAIL, SH_BULLWHIP,
    SH_QUARTERSTAFF, SR_JAVELIN, SR_AKLYS, SH_CLUB, SH_PICK_AXE,
    SH_RUBBER_HOSE, SH_WAR_HAMMER, SR_SILVER_DAGGER, SR_ELVEN_DAGGER,
    SR_DAGGER, SR_ORCISH_DAGGER, SH_ATHAME, SH_SCALPEL, SR_KNIFE,
    SH_WORM_TOOTH,
];
/* objects.h `bi` field, extracted from the WEAPON()/WEPTOOL() rows.  Five of
 * these are WEAPON_CLASS; the unicorn horn is a WEPTOOL (TOOL_CLASS) and was
 * missed by a first pass that only read WEAPON() rows — its row is
 * `WEPTOOL("unicorn horn", NoDes, 1, 1, 1, 0, 20, ...)`, `bi` (4th field) is
 * 1, so it IS bimanual.  The pick-axe is also a WEPTOOL but its `bi` is 0.
 * (objects.h:1013-1016; verified against the WEPTOOL() macro at objects.h:892
 * which maps positional args to kn,mgc,bi,prob,wt,... — so the 3rd numeric
 * field after the two description strings is `bi`.) */
export const SH_BIMANUAL = new Set([
    SH_TSURUGI, SH_DWARVISH_MATTOCK, SH_TWO_HANDED_SWORD, SH_BATTLE_AXE,
    SH_QUARTERSTAFF, SH_UNICORN_HORN,
]);

/* C monsters.h — Wizard of Yendor PM index (mons[] order); needed by abon's
 * adj_lev(&mons[u.umonnum]) Upolyd branch below. */
const PM_WIZARD_OF_YENDOR = 285; /* monsters.h:2858 MON(... WIZARD_OF_YENDOR);
                                  * was 291 = PM_HORNED_DEVIL */

export function abon() {
    const u = game.u || {};
    const str = acurr(u, A_STR);
    const dex = acurr(u, A_DEX);
    const umonnum = u.umonnum | 0;
    const umonster = u.umonster | 0;
    if (umonnum !== umonster) {
        const mlevel = _MONS[umonnum][1] | 0;
        let tmp;
        if (umonnum === PM_WIZARD_OF_YENDOR) {
            const died = (game.mvitals && game.mvitals[PM_WIZARD_OF_YENDOR])
                ? (game.mvitals[PM_WIZARD_OF_YENDOR].died | 0) : 0;
            tmp = mlevel + died;
            if (tmp > 49) tmp = 49;
            return tmp - 3;
        }
        if (mlevel > 49) return 50 - 3;
        tmp = mlevel;
        const tmp2a = levelDifficulty() - tmp;
        if (tmp2a < 0) tmp--;
        else tmp += Math.trunc(tmp2a / 5);
        const tmp2b = (u.ulevel | 0) - mlevel;
        if (tmp2b > 0) tmp += Math.trunc(tmp2b / 4);
        let tmp2c = Math.trunc((3 * mlevel) / 2);
        if (tmp2c > 49) tmp2c = 49;
        const adjlev = tmp > tmp2c ? tmp2c : tmp > 0 ? tmp : 0;
        return adjlev - 3;
    }
    let sbon;
    if (str < 6) sbon = -2;
    else if (str < 8) sbon = -1;
    else if (str < 17) sbon = 0;
    else if (str < STR18(50)) sbon = 1; /* C weapon.c:968: up to 18/49 */
    else if (str < 118) sbon = 2; /* STR18(100) = 18+100 */
    else sbon = 3;
    /* Game tuning kludge: make it a bit easier for a low level character to
     * hit (weapon.c:970-972). */
    sbon += ((u.ulevel | 0) < 3) ? 1 : 0;
    if (dex < 4) return sbon - 3;
    else if (dex < 6) return sbon - 2;
    else if (dex < 8) return sbon - 1;
    else if (dex < 14) return sbon;
    else return sbon + dex - 14;
}

/* Damage bonus from strength (weapon.c dbon).
 * C ref: nethack-c/src/weapon.c dbon() */
export function dbon() {
    const u = game.u || {};
    const str = acurr(u, A_STR);
    if (Upolyd(u))
        return 0;
    if (str < 6)
        return -1;
    else if (str < 16)
        return 0;
    else if (str < 18)
        return 1;
    else if (str == 18)
        return 2; /* up to 18 */
    else if (str <= STR18(75))
        return 3; /* up to 18/75 */
    else if (str <= STR18(90))
        return 4; /* up to 18/90 */
    else if (str < STR18(100))
        return 5; /* up to 18/99 */
    else
        return 6;
}

/* Per-otyp oc_hitbon ("to hit" bonus), indexed by otyp.
 * Generated from nethack-c/include/objects.h WEAPON()/PROJECTILE()/BOW() macros:
 * the hitbon field is added unconditionally in hitval() [weapon.c:159].
 * Weapons start at otyp 18 (ARROW); index = otyp; all non-weapon otyps are 0.
 * C ref: weapon.c:159 tmp += objects[otmp->otyp].oc_hitbon. */
const WEAPON_HITBON = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,2,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,-1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

/* objects.h WEPTOOL() entries — pick-axe/grappling hook (WHACK) and unicorn
 * horn (PIERCE) — see the oc_hitbon comment in hitval() below. */
const PICK_AXE_HITBON_UH = 259, GRAPPLING_HOOK_HITBON_UH = 260,
      UNICORN_HORN_HITBON_UH = 261;

/* SPEAR-skill otyps (objects.h: oc_skill == P_SPEAR=17): spear(27), elven(28),
 * orcish(29), dwarvish(30), silver(31), javelin(32). Trident(33) is P_TRIDENT.
 * C ref: obj.h:233 is_spear(otmp) = oclass==WEAPON_CLASS && oc_skill==P_SPEAR. */
const SPEAR_OTYPS = new Set([27, 28, 29, 30, 31, 32]);

/* kebabable monster letters (mlet): S_XORN(50), S_DRAGON(30), S_JABBERWOCK(36),
 * S_NAGA(40), S_GIANT(34). C ref: weapon.c:71 kebabable[]. */
const KEBABABLE_MLET = new Set([50, 30, 36, 40, 34]);

export function hitval(weapon, mtmp, mndx) {
    if (!weapon) return 0;
    let tmp = 0;
    const otyp = (weapon.otyp | 0);
    const row = (mndx >= 0 && mndx < _MONS.length) ? _MONS[mndx] : null;
    const mlet = row ? (row[0] | 0) : -1;
    /* C weapon.c:153-156: spe is an enchantment only for weapons/weptools.
     * Other wielded objects (such as corpses) use spe for unrelated state. */
    const Is_weapon = (weapon.oclass | 0) === WEAPON_CLASS || is_weptool(weapon);
    const _isArmor = (weapon.oclass | 0) === ARMOR_CLASS;
    if (Is_weapon) tmp += (weapon.spe | 0);
    /* oc_hitbon is the objclass union field oc_oc1 (objclass.h), which for
     * ARMOR_CLASS holds a_ac: a wielded armor piece adds its base AC to hit
     * (weapon.c:159), and spe only for Is_weapon (weapon.c:155-156). */
    if (_isArmor) tmp += (ARMOR_DATA[otyp]?.a_ac | 0);
    else tmp += (otyp === PICK_AXE_HITBON_UH || otyp === GRAPPLING_HOOK_HITBON_UH) ? 4
         : (otyp === UNICORN_HORN_HITBON_UH) ? 1
         : (otyp >= 0 && otyp < WEAPON_HITBON.length) ? (WEAPON_HITBON[otyp] | 0) : 0;
    /* C weapon.c:164-165 — Is_weapon && blessed && mon_hates_blessings(mon).
     * Implemented via mon_hates_blessings in js/mondata.js:834; falls back
     * to game.youmonst as defender when mtmp is null. */
    if (Is_weapon && weapon.blessed && mon_hates_blessings(mtmp || game.youmonst))
        tmp += 2;
    /* is_spear(weapon) && strchr(kebabable, ptr->mlet) */
    if (SPEAR_OTYPS.has(otyp)) {
        if (KEBABABLE_MLET.has(mlet)) tmp += 2;
    }
    /* C weapon.c:171-176 — trident vs swimmers.  TRIDENT is objects.h otyp 33;
     * is_swimmer(ptr) = mflags1 & M1_SWIM.  S_EEL is 22, S_SNAKE is 41
     * (monsym.h), the same numbering KEBABABLE_MLET above uses. */
    if (otyp === TRIDENT_UH && row && ((row[6] >>> 0) & M1_SWIM_UH) !== 0) {
        if (is_pool_uh(mtmp ? (mtmp.mx | 0) : (game.u?.ux | 0),
                       mtmp ? (mtmp.my | 0) : (game.u?.uy | 0)))
            tmp += 4;
        else if (mlet === S_EEL_UH || mlet === S_SNAKE_UH)
            tmp += 2;
    }
    /* C weapon.c:179-180 — picks vs xorns and earth elementals.
     * is_pick(otmp) = oc_skill == P_PICK_AXE; passes_walls = mflags1 & M1_WALLWALK;
     * thick_skinned = mflags1 & M1_THICK_HIDE. */
    if (PICK_OTYPS_UH.has(otyp) && row
        && ((row[6] >>> 0) & M1_WALLWALK_UH) !== 0
        && ((row[6] >>> 0) & M1_THICK_HIDE_UH) !== 0)
        tmp += 2;
    /* C weapon.c:183-184 */
    if (weapon.oartifact)
        tmp += spec_abon(weapon, mtmp, mndx);
    return tmp;
}

const TRIDENT_UH = 33;

/* The two oc_skill == P_PICK_AXE rows in objects.h. */
const PICK_OTYPS_UH = new Set([259, 71]);

const M1_SWIM_UH = 0x00000002;

const M1_THICK_HIDE_UH = 0x00200000;

/* is_pool(x,y) is js/look.js's, already imported above as is_pool_uh; hitval's
 * caller passes mtmp === null for the hero, so the hero's square is used then. */
export async function weapon_hit_bonus(weapon) {
    const _u = game.u || {}, wep_type = weapon_type(weapon);
    const type = (_u.twoweap && (weapon === _u.uwep || weapon === _u.uswapwep))
        ? P_TWO_WEAPON_COMBAT : wep_type;
    let bonus = 0;
    if (type === P_BARE_HANDED_COMBAT) {
        /* C weapon.c:1601-1607, read straight off the skill array rather than
         * off a hardcoded starting value:
         *   bonus = P_SKILL(type);
         *   bonus = max(bonus, P_UNSKILLED) - 1;
         *   bonus = ((bonus + 2) * (martial_bonus() ? 2 : 1)) / 2;
         * skill_init (js/skills.js, weapon.c:1784) is the writer. */
        const martial = _uh_martial_bonus(); /* skills.h:81 — Samurai or Monk */
        const pSkill = P_SKILL(P_BARE_HANDED_COMBAT);
        bonus = Math.max(pSkill, P_UNSKILLED) - 1;
        bonus = ((bonus + 2) * (martial ? 2 : 1)) / 2 | 0;
    }
    else if (type === P_NONE) {
        bonus = 0;
    } else if (type <= P_LAST_WEAPON) {
        switch (P_SKILL(type)) {
        case P_SKILLED: bonus = 2; break;
        case P_EXPERT:  bonus = 3; break;
        case P_BASIC:   bonus = 0; break;
        default: await skill_impossible("weapon_hit_bonus: bad skill %d", P_SKILL(type));
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus = -4; break;
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        let skill = P_SKILL(P_TWO_WEAPON_COMBAT);
        if (P_SKILL(wep_type) < skill)
            skill = P_SKILL(wep_type);
        switch (skill) {
        case P_SKILLED: bonus = -5; break;
        case P_EXPERT:  bonus = -3; break;
        case P_BASIC:   bonus = -7; break;
        default: await skill_impossible("weapon_hit_bonus: bad skill %d", skill);
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus = -9; break;
        }
    }
    /* C weapon.c:1665-1682 — "It's harder to hit while you are riding". */
    if (_u.usteed) {
        switch (P_SKILL(P_RIDING)) {
        case P_SKILLED:
        case P_EXPERT:  break;
        case P_BASIC:   bonus -= 1; break;
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus -= 2; break;
        }
        if (_u.twoweap) bonus -= 2;
    }
    return bonus;
}

/* weapon_dam_bonus(weapon) — damage bonus from weapon skill and other factors.
 * C ref: weapon.c:1643-1729 */
export async function weapon_dam_bonus(weapon) {
    const _u = game.u || {};
    const wep_type = weapon_type(weapon);
    const type = (_u.twoweap && (weapon === _u.uwep || weapon === _u.uswapwep))
        ? P_TWO_WEAPON_COMBAT : wep_type;
    let bonus = 0;
    if (type === P_BARE_HANDED_COMBAT) {
        /* C weapon.c:1696-1701, read straight off the skill array.  The old
         * `pSkill = isMonk ? P_BASIC : P_UNSKILLED` hardcode was wrong for the
         * SAMURAI: skill_init's "high potential fighters already know how to
         * use their hands" bump (weapon.c:1784) fires whenever
         * P_MAX_SKILL(P_BARE_HANDED_COMBAT) > P_EXPERT, and u_init.c Skill_S
         * carries { P_MARTIAL_ARTS, P_MASTER } — P_MARTIAL_ARTS IS
         * P_BARE_HANDED_COMBAT (skills.h:69) — so a Samurai starts at P_BASIC
         * too, for a C bonus of ((1+1)*3)/2 = 3, not the 1 this produced. */
        const martial = _uh_martial_bonus(); /* skills.h:81 — Samurai or Monk */
        const pSkill = P_SKILL(P_BARE_HANDED_COMBAT);
        bonus = Math.max(pSkill, P_UNSKILLED) - 1;
        bonus = ((bonus + 1) * (martial ? 3 : 1)) / 2 | 0;
    }
    else if (type === P_NONE) {
        bonus = 0;
    } else if (type <= P_LAST_WEAPON) {
        switch (P_SKILL(type)) {
        case P_SKILLED: bonus = 1; break;
        case P_EXPERT:  bonus = 2; break;
        case P_BASIC:   bonus = 0; break;
        default: await skill_impossible("weapon_dam_bonus: bad skill %d", P_SKILL(type));
        case P_ISRESTRICTED:
        case P_UNSKILLED: bonus = -2; break;
        }
    } else if (type === P_TWO_WEAPON_COMBAT) {
        let skill = P_SKILL(P_TWO_WEAPON_COMBAT);
        if (P_SKILL(wep_type) < skill)
            skill = P_SKILL(wep_type);
        switch (skill) {
        case P_SKILLED: bonus = 0; break;
        case P_EXPERT:  bonus = 1; break;
        case P_BASIC:   bonus = -1; break;
        default:        bonus = -3; break; /* P_ISRESTRICTED / P_UNSKILLED */
        }
    }
    /* C weapon.c:1711-1726 — "Riding gives some thrusting damage". */
    if (_u.usteed && type !== P_TWO_WEAPON_COMBAT) {
        switch (P_SKILL(P_RIDING)) {
        case P_SKILLED: bonus += 1; break;
        case P_EXPERT:  bonus += 2; break;
        default:        break; /* P_ISRESTRICTED / P_UNSKILLED / P_BASIC */
        }
    }
    return bonus;
}

/* uwep_skill_type() — return the skill type for the primary (right-hand) weapon.
 * If two-weaponing, return P_TWO_WEAPON_COMBAT (36).
 * Otherwise return weapon_type(uwep).
 * C ref: weapon.c:1526-1533 */
export function uwep_skill_type() {
    const u = game.u || {};
    if (u.twoweap)
        return P_TWO_WEAPON_COMBAT;
    return weapon_type(u.uwep);
}

/* weapon_type(obj) — return the skill type of a weapon or weapon-tool object.
 * Returns P_BARE_HANDED_COMBAT (35) if obj is null.
 * Returns P_NONE (0) if obj is not a weapon/tool/gem/ammo.
 * Otherwise returns the absolute value of objects[otyp].oc_skill.
 * C ref: weapon.c:1511-1524 */
export function weapon_type(obj) {
    if (!obj)
        return P_BARE_HANDED_COMBAT; /* Not using a weapon */
    const oclass = obj.oclass | 0;
    if (oclass !== WEAPON_CLASS && oclass !== TOOL_CLASS && oclass !== GEM_CLASS)
        return P_NONE; /* Not a weapon, weapon-tool, or ammo */
    const otyp = obj.otyp | 0;
    const type = (otyp >= 0 && otyp < MKOBJ_OC_SKILL.length)
        ? (MKOBJ_OC_SKILL[otyp] | 0)
        : 0;
    return (type < 0) ? -type : type;
}

/* C ref: weapon.c:1119-1123
 * P_NAME macro implementation. Maps skill to skill name string via:
 * - skill_names_indices lookup (skill -> object otyp or negative index)
 * - For positive indices: getObjName(otyp)
 * - For P_BARE_HANDED_COMBAT: barehands_or_martial[martial_bonus()]
 * - For other negative indices: odd_skill_names[-idx]
 */
const PICK_AXE = 259, UNICORN_HORN = 261;

const skill_names_indices = [
    /* C ref: weapon.c:38-49 — maps skill index to object otyp or negative index (PN_*) */
    /* Indexed by P_* constants: 0=P_NONE, 1=P_DAGGER, ... 37=P_RIDING */
    0,                             /* 0:  P_NONE */
    34,   40,   44,   259,  46,   52,   54,   55,    /* 1-8:  P_DAGGER...P_TWO_HANDED_SWORD */
    -5,   77,   73,   75,   81,   -6,   79,   -4,    /* 9-16: P_SABER...PN_POLEARMS */
    /* 17-24: P_SPEAR, P_TRIDENT, P_LANCE, P_BOW, P_SLING, P_CROSSBOW,
     * P_DART, P_SHURIKEN.  Index 22 (P_CROSSBOW) read 23 = "crossbow bolt",
     * the AMMO otyp; C weapon.c:42 has CROSSBOW, the launcher = otyp 88
     * (objects.h; oc_skill 88 == +22 == P_CROSSBOW, matching 87 == SLING at
     * index 21).  Latent until now: the local P_CROSSBOW was 23, so
     * skill_name() was never reached for a wielded crossbow. */
    27,   33,   72,   83,   87,   88,   24,   25,
    26,   -7,   261,                                /* 25-27: P_BOOMERANG, P_WHIP, P_UNICORN_HORN (UNICORN_HORN otyp 261) */
    -8,   -9,   -10,  -11,  -12,  -13,  -14,         /* 28-34: P_ATTACK_SPELL...P_MATTER_SPELL */
    -1,   -2,   -3,                                   /* 35-37: P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT, P_RIDING */
];

/* C ref: weapon.c:52-57 — odd_skill_names array for negative indices */
const odd_skill_names = [
    "no skill",                    /* index 0 (unused) */
    "bare hands",                  /* index 1 (use barehands_or_martial[] instead) */
    "two weapon combat",           /* index 2, PN_TWO_WEAPONS = -2 */
    "riding",                      /* index 3, PN_RIDING = -3 */
    "polearms",                    /* index 4, PN_POLEARMS = -4 */
    "saber",                       /* index 5, PN_SABER = -5 */
    "hammer",                      /* index 6, PN_HAMMER = -6 */
    "whip",                        /* index 7, PN_WHIP = -7 */
    "attack spells",               /* index 8, PN_ATTACK_SPELL = -8 */
    "healing spells",              /* index 9, PN_HEALING_SPELL = -9 */
    "divination spells",           /* index 10, PN_DIVINATION_SPELL = -10 */
    "enchantment spells",          /* index 11, PN_ENCHANTMENT_SPELL = -11 */
    "clerical spells",             /* index 12, PN_CLERIC_SPELL = -12 */
    "escape spells",               /* index 13, PN_ESCAPE_SPELL = -13 */
    "matter spells",               /* index 14, PN_MATTER_SPELL = -14 */
];

const barehands_or_martial = [
    "bare handed combat",          /* martial_bonus() = 0 */
    "martial arts",                /* martial_bonus() = 1 (Samurai or Monk) */
];

/**
 * skill_name: return the name of a skill.
 * C ref: weapon.c:1119-1123
 * Returns string name of skill; dispatch via:
 * - positive index: getObjName(skill_names_indices[skill])
 * - P_BARE_HANDED_COMBAT: barehands_or_martial[martial_bonus()]
 * - negative index: odd_skill_names[-skill_names_indices[skill]]
 * @param {number} skill - skill index (P_* constant)
 * @return {string} - skill name
 */
export function skill_name(skill) {
    skill = skill | 0;
    if (skill < 0 || skill >= skill_names_indices.length)
        return "unknown skill";

    const idx = skill_names_indices[skill];

    /* Positive index: look up object name */
    if (idx > 0) {
        /* getObjName() directly reads the complete OC_NAME table, including
         * fixed-name tools such as PICK_AXE and UNICORN_HORN, matching
         * C's OBJ_NAME(objects[skill_names_indices[skill]]). */
        return getObjName(idx) ?? ((idx === PICK_AXE || idx === UNICORN_HORN) ? OC_NAME[idx] : null) ?? "unknown";
    }

    /* P_BARE_HANDED_COMBAT: use barehands_or_martial */
    if (skill === P_BARE_HANDED_COMBAT) {
        const martial = _uh_martial_bonus() ? 1 : 0;
        return barehands_or_martial[martial];
    }

    /* Negative index: look up in odd_skill_names */
    const negIdx = -idx;
    if (negIdx >= 0 && negIdx < odd_skill_names.length) {
        return odd_skill_names[negIdx];
    }

    return "unknown skill";
}

/* skill_level_name(skill, buf) — copy the skill level name into the buffer.
 * C ref: weapon.c:1086-1118.
 * Returns the buffer with the proficiency level name (Unskilled/Basic/etc). */
export function skill_level_name(skill, buf) {
    /* P_SKILL(skill) — in C this macro extracts the proficiency level.
     * The proficiency constants are P_UNSKILLED=1 through P_GRAND_MASTER=6. */
    const P_UNSKILLED = 1;
    const P_BASIC = 2;
    const P_SKILLED = 3;
    const P_EXPERT = 4;
    const P_MASTER = 5;
    const P_GRAND_MASTER = 6;
    let ptr;

    switch (P_SKILL(skill)) {
    case P_UNSKILLED:
        ptr = "Unskilled";
        break;
    case P_BASIC:
        ptr = "Basic";
        break;
    case P_SKILLED:
        ptr = "Skilled";
        break;
    case P_EXPERT:
        ptr = "Expert";
        break;
    case P_MASTER:
        ptr = "Master";
        break;
    case P_GRAND_MASTER:
        ptr = "Grand Master";
        break;
    default:
        ptr = "Unknown";
        break;
    }
    /* Strcpy(buf, ptr) — in JS just return the string */
    return ptr;
}

/* weapon_descr(obj) — returns a short description of a wielded weapon/object.
 * C ref: weapon.c:89-143.
 * Returns a singular noun string describing the object in a combat context. */
export function weapon_descr(obj) {
    /* Skill constants P_SLING/P_BOW/P_CROSSBOW/P_FLAIL/P_PICK_AXE now come
     * from const.js (see the import at the top of this file).  The five
     * file-local copies that used to sit here read 22/21/23/13/4; skills.h:38-44
     * says 21/20/22/13/4, so the three launcher skills were each +1 and the
     * other two were right — NOT a uniform offset.  Effect: weapon_type()
     * returns the true skills.h value, so `case P_BOW` never matched a bow
     * (20 vs 21) while `case P_BOW` DID match a sling (21), `case P_SLING`
     * matched a crossbow (22) and `case P_CROSSBOW` matched a dart (23) — a
     * four-way mis-dispatch, not an off-by-one that cancels. */

    /* Object type constants */
    const CORPSE = 265;
    const TIN = 296;
    const EGG = 266;
    const STATUE = 476;
    const BOULDER = 475;
    const TOWEL = 234;      /* objects.h:949; was 237 = STETHOSCOPE */
    const TIN_OPENER = 239; /* objects.h:962; was 236 = LEASH */
    const ROCK = 474;
    const GRAPPLING_HOOK = 260; /* objects.h:1012; was 82 = BULLWHIP */
    const DWARVISH_MATTOCK = 71;
    const GEM_CLASS = 13;

    /* Gray stone otyps for is_graystone */
    /* objects.h:1599/1601/1603/1605 — the four gray stones.  Were 478..481
     * (iron chain / blinding venom / acid venom / past the end of objects[]),
     * i.e. is_graystone() below never matched anything.  The correct values are
     * already in this file at line ~2017 as SR_LUCKSTONE/SR_LOADSTONE/SR_FLINT. */
    const LUCKSTONE = 470;
    const LOADSTONE = 471;
    const TOUCHSTONE = 472;
    const FLINT = 473;

    /* def_oc_syms lookup: class index → display name */
    /* drawing.c def_oc_syms[].name (defsym.h:465-484); makesingular() below. */
    const def_oc_syms = [
        "",  /* 0 */
        "illegal objects",  /* 1 */
        "weapons",  /* 2 */
        "armor",  /* 3 */
        "rings",  /* 4 */
        "amulets",  /* 5 */
        "tools",  /* 6 */
        "food",  /* 7 */
        "potions",  /* 8 */
        "scrolls",  /* 9 */
        "spellbooks",  /* 10 */
        "wands",  /* 11 */
        "coins",  /* 12 */
        "rocks",  /* 13 */
        "large stones",  /* 14 */
        "iron balls",  /* 15 */
        "chains",  /* 16 */
        "venoms",  /* 17 */
    ];

    function is_ammo(o) {
        const otyp = o.otyp | 0;
        if (otyp < 0 || otyp >= MKOBJ_OC_SKILL.length) return false;
        return (MKOBJ_OC_SKILL[otyp] | 0) < 0;
    }

    function is_graystone(o) {
        const otyp = o.otyp | 0;
        return otyp === LUCKSTONE || otyp === LOADSTONE ||
               otyp === TOUCHSTONE || otyp === FLINT;
    }

    const skill = weapon_type(obj);
    let descr = skill_name(skill);

    /* assorted special cases */
    switch (skill) {
    case P_NONE:
        /* not a weapon or weptool: use item class name;
           override class name for things where it sounds strange and
           for things that aren't unexpected to find being wielded:
           corpses, tins, eggs, and globs avoid "food",
           statues and boulders avoid "large rock",
           and towels and tin openers avoid "tool" */
        descr = (obj.otyp === CORPSE || obj.otyp === TIN || obj.otyp === EGG
                 || obj.otyp === STATUE || obj.otyp === BOULDER
                 || obj.otyp === TOWEL || obj.otyp === TIN_OPENER)
                ? OC_NAME[obj.otyp]
                : obj.globby ? "glob"
                  : (def_oc_syms[obj.oclass | 0] || "strange object");
        break;
    case P_SLING:
        if (is_ammo(obj))
            descr = (obj.otyp === ROCK || is_graystone(obj))
                        ? "stone"
                        : (obj.oclass === GEM_CLASS)
                            ? "gem"
                            : (def_oc_syms[obj.oclass | 0] || "strange object");
        break;
    case P_BOW:
        if (is_ammo(obj))
            descr = "arrow";
        break;
    case P_CROSSBOW:
        if (is_ammo(obj))
            descr = "bolt";
        break;
    case P_FLAIL:
        if (obj.otyp === GRAPPLING_HOOK)
            descr = "hook";
        break;
    case P_PICK_AXE:
        /* even if "dwarvish mattock" hasn't been discovered yet */
        if (obj.otyp === DWARVISH_MATTOCK)
            descr = "mattock";
        break;
    default:
        break;
    }
    return makesingular(descr);
}

/* C mondata.h:68 is_wooden(ptr) = (ptr == &mons[PM_WOOD_GOLEM]);
 * mondata.h:215 hates_light(ptr) = (ptr == &mons[PM_GREMLIN]).
 * pmidx values from js/pm.generated.js (PM_WOOD_GOLEM 254, PM_GREMLIN 40). */
/* C obj.h:126 greatest_erosion(otmp) — max of the two 2-bit erosion fields. */
function greatest_erosion_dv(otmp) {
    if (!otmp)
        return 0;
    const e1 = otmp.oeroded | 0, e2 = otmp.oeroded2 | 0;
    return e1 > e2 ? e1 : e2;
}

const PM_WOOD_GOLEM_DV = 254;

const PM_GREMLIN_DV = 40;

export function dmgval(otmp, mon) {
    /* Weapon constants (otyp values from objects.h order). */
    const CREAM_PIE = 287; /* objects.h:1100 FOOD("cream pie", ...);
                            * was 286 = LUMP_OF_ROYAL_JELLY */
    const BOULDER = 475;          /* objects.h ROCK_CLASS, oc_wsdam=oc_wldam=20 */
    const STATUE = 476;          /* objects.h ROCK_CLASS, oc_wsdam=oc_wldam=20 */
    const HEAVY_IRON_BALL = 477;  /* objects.h BALL_CLASS, oc_wsdam=oc_wldam=25, oc_weight=480 */

    /* Weapon otyp constants from C weapon.c / objects.h */
    const IRON_CHAIN_OTYP = 478; /* objects.h:1631 CHAIN_CLASS IRON_CHAIN;
                                  * was 9 = GENERIC_SCROLL, so the d(4,4) chain
                                  * damage case below was dead */
    const CROSSBOW_BOLT = 23;
    const MORNING_STAR = 75;
    const PARTISAN = 59;
    const RUNESWORD = 58;
    const ELVEN_BROADSWORD = 53;
    const BROADSWORD = 52;
    const FLAIL = 81;
    const RANSEUR = 60;
    const VOULGE = 65;
    const ACID_VENOM = 480; /* objects.h:1642 VENOM_CLASS ACID_VENOM;
                             * was 245 = TIN_WHISTLE */
    const HALBERD = 63;
    const SPETUM = 61;
    const BATTLE_AXE = 45;
    const BARDICHE = 64;
    const TRIDENT = 33;
    const TSURUGI = 57;
    const DWARVISH_MATTOCK = 71;
    const TWO_HANDED_SWORD = 55;
    const MACE = 73;
    const SILVER_MACE = 74;
    const WAR_HAMMER = 76;
    const BILL_GUISARME = 68;
    const GUISARME = 67;
    const LUCERN_HAMMER = 69;

    /* Object class constants (objclass.h) */
    const BALL_CLASS = 15;
    const CHAIN_CLASS = 16;

    /* Helper to compute weapon damage die. */
    function ocWsDam(otyp) {
        return (otyp >= 0 && otyp < WEAPON_WSDAM.length) ? (WEAPON_WSDAM[otyp] | 0) : 0;
    }
    function ocWlDam(otyp) {
        return (otyp >= 0 && otyp < WEAPON_WLDAM.length) ? (WEAPON_WLDAM[otyp] | 0) : 0;
    }

    let tmp = 0;
    const otyp = (otmp?.otyp | 0);
    const ptr = mon?.data;

    if (!ptr) return 0;

    /* C boolean Is_weapon = (otmp->oclass == WEAPON_CLASS || is_weptool(otmp)).
     * C obj.h:249 `is_weptool(o) ((o)->oclass == TOOL_CLASS
     *                             && objects[(o)->otyp].oc_skill != P_NONE)`
     * — the three WEPTOOL() rows (pick-axe, grappling hook, unicorn horn) are
     * the only TOOL_CLASS objects objects.h gives an oc_skill.  With this term
     * missing, a wielded pick-axe skipped BOTH the `tmp += otmp->spe`
     * enchantment (weapon.c:297-302) and the weapon-vs-monster bonus block
     * (weapon.c:323-342), whose blessed arm DRAWS rnd(4). */
    const P_NONE_SKILL = 0; /* C skills.h P_NONE */
    const Is_weapon = ((otmp?.oclass | 0) === WEAPON_CLASS)
        || (((otmp?.oclass | 0) === TOOL_CLASS)
            && (MKOBJ_OC_SKILL[(otmp?.otyp | 0)] | 0) !== P_NONE_SKILL);

    /* CREAM_PIE does no damage */
    if (otyp === CREAM_PIE)
        return 0;

    /* Determine base damage die by monster size */
    const msize = (ptr?.msize | 0) ?? 2;
    const bigmonst = (msize >= MZ_LARGE); /* MZ_LARGE = 3 */

    if (bigmonst) {
        /* WEAPON_WLDAM now covers every otyp objects.h gives a damage die, so the
         * hand-written boulder/statue/heavy-iron-ball fallbacks that used to sit
         * here are table rows; keeping them would be a stale premise. */
        const wldam = ocWlDam(otyp);
        if (wldam)
            tmp = rnd(wldam);

        /* Large monster damage bonuses (switch statement) */
        switch (otyp) {
        case IRON_CHAIN_OTYP:
        case CROSSBOW_BOLT:
        case MORNING_STAR:
        case PARTISAN:
        case RUNESWORD:
        case ELVEN_BROADSWORD:
        case BROADSWORD:
            tmp++;
            break;

        case FLAIL:
        case RANSEUR:
        case VOULGE:
            tmp += rnd(4);
            break;

        case ACID_VENOM:
        case HALBERD:
        case SPETUM:
            tmp += rnd(6);
            break;

        case BATTLE_AXE:
        case BARDICHE:
        case TRIDENT:
            tmp += d(2, 4);
            break;

        case TSURUGI:
        case DWARVISH_MATTOCK:
        case TWO_HANDED_SWORD:
            tmp += d(2, 6);
            break;
        }
    } else {
        const wsdam = ocWsDam(otyp);  /* see the WLDAM note above: table, not fallbacks */
        if (wsdam)
            tmp = rnd(wsdam);

        /* Small monster damage bonuses (switch statement) */
        switch (otyp) {
        case IRON_CHAIN_OTYP:
        case CROSSBOW_BOLT:
        case MACE:
        case SILVER_MACE:
        case WAR_HAMMER:
        case FLAIL:
        case SPETUM:
        case TRIDENT:
            tmp++;
            break;

        case BATTLE_AXE:
        case BARDICHE:
        case BILL_GUISARME:
        case GUISARME:
        case LUCERN_HAMMER:
        case MORNING_STAR:
        case RANSEUR:
        case BROADSWORD:
        case ELVEN_BROADSWORD:
        case RUNESWORD:
        case VOULGE:
            tmp += rnd(4);
            break;

        case ACID_VENOM:
            tmp += rnd(6);
            break;
        }
    }

    /* Add weapon enchantment bonus (spe) */
    if (Is_weapon) {
        tmp += (otmp?.spe | 0);
        if (tmp < 0)
            tmp = 0;
    }

    /* Thick-skinned and shade checks */
    /* C weapon.c:304 —
     *   if (objects[otyp].oc_material <= LEATHER && thick_skinned(ptr))
     *       tmp = 0;
     * objclass.h:20 LEATHER = 7; thick_skinned is mondata.h:69
     * (mflags1 & M1_THICK_HIDE, monflag.h:106 = 0x00200000L). */
    if (sr_oc_material(otyp) <= LEATHER_MAT && thick_skinned(ptr))
        tmp = 0;
    /* C weapon.c:306-307 —
     *   if (ptr == &mons[PM_SHADE] && !shade_glare(otmp))
     *       tmp = 0;
     * This arm was previously written as `if (ptr === null)`, which is dead
     * code (a null ptr already returned 0 above), so dmgval() returned a
     * non-zero damage for ordinary weapons against a shade.  That is exactly
     * the value shade_miss() (uhitm.c:2028) tests for zero/not-zero, so the
     * arm is load-bearing on the shade path. */
    if ((ptr?.pmidx | 0) === PM_SHADE && !shade_glare(otmp))
        tmp = 0;

    /* "very heavy iron ball"; weight increase is in increments (weapon.c:310-319).
     * oc_weight[HEAVY_IRON_BALL]=480, WT_IRON_BALL_INCR=160 (objects.h:1626, weight.h:18). */
    if (otyp === HEAVY_IRON_BALL && tmp > 0) {
        const wt_base = (otmp?.owt | 0) > 480 ? ((otmp?.owt | 0) - 480) / 160 : 0;
        if (wt_base > 0) {
            tmp += rnd(4 * wt_base);
            if (tmp > 25)
                tmp = 25;
        }
    }

    /* Weapon vs. monster type bonuses */
    if (Is_weapon || (otmp?.oclass | 0) === GEM_CLASS ||
        (otmp?.oclass | 0) === BALL_CLASS || (otmp?.oclass | 0) === CHAIN_CLASS) {
        let bonus = 0;

        if ((otmp?.blessed | 0) && mon_hates_blessings(mon))
            bonus += rnd(4);
        /* C weapon.c:329-330 —
         *   if (is_axe(otmp) && is_wooden(ptr))
         *       bonus += rnd(4);
         * obj.h:217 is_axe(otmp) = ((otmp->oclass == WEAPON_CLASS
         *                            || otmp->oclass == TOOL_CLASS)
         *                           && objects[otmp->otyp].oc_skill == P_AXE);
         * mondata.h:68 is_wooden(ptr) = ((ptr) == &mons[PM_WOOD_GOLEM]).
         * NOTE js/dig.js:452 carries a file-local is_axe() that answers
         * `otyp === AXE` only — narrower than C, which admits every P_AXE-skill
         * otyp (AXE 44 and BATTLE_AXE 45).  It is not exported and is not the
         * body used here; this spells C's predicate off MKOBJ_OC_SKILL, the
         * same table Is_weapon above reads. */
        if (is_axe_dv(otmp) && (ptr.pmidx | 0) === PM_WOOD_GOLEM_DV)
            bonus += rnd(4);
        /* C weapon.c:331-332 —
         *   if (objects[otyp].oc_material == SILVER && mon_hates_silver(mon))
         *       bonus += rnd(20);
         * objclass.h:20 SILVER == 14, which is the same constant
         * SHADE_GLARE_SILVER_MAT above already carries for shade_glare().
         * mon_hates_silver is mondata.c:517 and is the REAL exported body in
         * js/mhitm.js:2023 (is_vampshifter || hates_silver(mon->data), and
         * hates_silver is js/makemon.js:685, C mondata.c:524 verbatim) — it is
         * already imported at the top of this file and already used by
         * special_dmgval below, so this is not a private stand-in. */
        if (sr_oc_material(otyp) === SHADE_GLARE_SILVER_MAT && mon_hates_silver(mon))
            bonus += rnd(20);
        /* C weapon.c:333-334 —
         *   if (artifact_light(otmp) && otmp->lamplit && hates_light(ptr))
         *       bonus += rnd(8);
         * hates_light is mondata.h:215, `((ptr) == &mons[PM_GREMLIN])`, and
         * nothing else.  js/makemon.js:3608 carries a file-local hates_light()
         * that answers `mlet is S_VAMPIRE/S_GHOST/S_ZOMBIE/S_LICH` — a
         * DIFFERENT predicate that C does not have; it is not exported and is
         * not used here, and C's one-monster test is spelled inline. */
        if (artifact_light(otmp) && (otmp?.lamplit | 0)
            && (ptr.pmidx | 0) === PM_GREMLIN_DV)
            bonus += rnd(8);

        if (bonus > 1 && (otmp?.oartifact | 0)
            && spec_dbon(otmp, mon, -1, 25) >= 25)
            bonus = ((bonus + 1) / 2) | 0;

        tmp += bonus;
    }

    /* Erosion penalty */
    if (tmp > 0) {
        /* C weapon.c:350 `tmp -= greatest_erosion(otmp);`.  obj.h:126
         * greatest_erosion(otmp) = max(otmp->oeroded, otmp->oeroded2), both
         * 2-bit fields (MAX_ERODE 3), so this is a 0..3 damage penalty and
         * DRAWS NO RNG.  js/dig.js:104 has the same body but file-local and
         * unexported; js/cmd.js:15640 has a third copy as
         * greatest_erosion_st(). Spelled inline rather than adding a fourth
         * cross-file import. */
        tmp -= greatest_erosion_dv(otmp);
        if (tmp < 1)
            tmp = 1;
    }

    return tmp;
}

export function autoreturn_weapon(otmp) {
    // arwep static array: throw-and-return weapons
    // C: static NEARDATA const struct throw_and_return_weapon arwep[] = {
    //     { AKLYS, AKLYS_LIM * AKLYS_LIM, 1 },
    // };
    const AKLYS = 80;  // weapon otyp constant
    const AKLYS_LIM = 4;  // BOLT_LIM / 2; BOLT_LIM = 8
    const arwep = [
        { otyp: AKLYS, range: AKLYS_LIM * AKLYS_LIM, tethered: 1 }
    ];

    // Loop through arwep and return first match
    for (let i = 0; i < arwep.length; i++) {
        if (otmp.otyp === arwep[i].otyp) {
            return arwep[i];
        }
    }
    return null;
}

/* can_advance(skill, speedy) — C ref: weapon.c:1150-1164.
 * Check if a skill can be advanced.
 * Args: skill (int), speedy (boolean)
 * Returns: boolean
 * Calls: practice_needed_to_advance (macro: level*level*20),
 *        slots_required (see uhitm.js:6718).
 * Reads: u.weapon_skills[skill], u.skills_advanced, u.weapon_slots,
 *        wizard (flags.debug, via gstate.js wizard() — C's flag.h:30 macro).
 * C source:
 *   if (P_RESTRICTED(skill)
 *       || P_SKILL(skill) >= P_MAX_SKILL(skill)
 *       || u.skills_advanced >= P_SKILL_LIMIT)
 *       return FALSE;
 *   if (wizard && speedy)
 *       return TRUE;
 *   return (boolean) ((int) P_ADVANCE(skill)
 *                     >= practice_needed_to_advance(P_SKILL(skill))
 *                     && u.weapon_slots >= slots_required(skill));
 */
export function can_advance(skill, speedy) {
    const u = game.u;
    if (!u.weapon_skills) return false;

    const skillData = u.weapon_skills[skill];
    if (!skillData) return false;

    // P_RESTRICTED(skill) = (u.weapon_skills[skill].skill == P_ISRESTRICTED)
    if (skillData.skill === P_ISRESTRICTED)
        return false;

    // P_MAX_SKILL(type) = u.weapon_skills[type].max_skill
    if (skillData.skill >= (skillData.max_skill | 0))
        return false;

    // P_SKILL_LIMIT = 60
    if ((u.skills_advanced | 0) >= P_SKILL_LIMIT)
        return false;

    // wizard && speedy
    if (wizard() && speedy)
        return true;

    // P_ADVANCE(skill) = u.weapon_skills[skill].advance
    const advance = (skillData.advance | 0);
    // P_SKILL(skill) = u.weapon_skills[skill].skill
    const skillLevel = (skillData.skill | 0);
    // practice_needed_to_advance(level) = level * level * 20
    const practice_needed = Math.imul(Math.imul(skillLevel, skillLevel), 20);

    if (advance < practice_needed)
        return false;

    // slots_required(skill) — see uhitm.js:6718
    const slots = slots_required(skill);
    if ((u.weapon_slots | 0) < slots)
        return false;

    return true;
}

/* slots_required(skill) — C ref: weapon.c:1129-1150.
 * C source:
 *   int tmp = P_SKILL(skill);
 *   if (skill <= P_LAST_WEAPON || skill == P_TWO_WEAPON_COMBAT)
 *       return tmp;
 *   return (tmp + 1) / 2;
 * The comment tables in C spell it out: a weapon skill costs its CURRENT level
 * in slots (unskilled->basic 1, basic->skilled 2, skilled->expert 3); unarmed,
 * martial and riding cost half that, rounded up.
 * This was a throwing stub, which made can_advance() above unreachable for any
 * non-wizard caller — it threw before it could return.  RNG-free. */
export function slots_required(skill) {
    const tmp = (game.u?.weapon_skills?.[skill]?.skill | 0);
    if (skill <= P_LAST_WEAPON || skill === P_TWO_WEAPON_COMBAT)
        return tmp;
    return ((tmp + 1) / 2) | 0;
}

/* lose_weapon_skill(n) — number of slots to lose; normally one.
 * C ref: weapon.c:1448-1469. */
export function lose_weapon_skill(n) {
    const u = game.u;
    let skill;
    while (--n >= 0) {
        if (u.weapon_slots) {
            u.weapon_slots--;
        } else if (u.skills_advanced) {
            skill = u.skill_record[--u.skills_advanced];
            if (u.weapon_skills[skill].skill <= P_UNSKILLED)
                throw new Error("panic: lose_weapon_skill (" + skill + ")");
            u.weapon_skills[skill].skill--;
            u.weapon_slots = slots_required(skill) - 1;
        }
    }
}

/* add_weapon_skill(n) — number of slots to gain; normally one.
 * C ref: weapon.c:1431-1445. */
export async function add_weapon_skill(n) {
    const u = game.u;
    let i, before = 0, after = 0;

    for (i = 0; i < P_NUM_SKILLS; i++)
        if (can_advance(i, false))
            before++;

    u.weapon_slots = (u.weapon_slots | 0) + (n | 0);

    for (i = 0; i < P_NUM_SKILLS; i++)
        if (can_advance(i, false))
            after++;

    if (before < after)
        await give_may_advance_msg(P_NONE);
}

/* use_skill(skill, degree) — C ref: weapon.c:1424-1434.
 * Add degree to skill's advance counter; if that causes the skill
 * to become advanceable, notify the player. */
export async function use_skill(skill, degree) {
    const u = game.u;
    if (!u.weapon_skills) return;
    const skillData = u.weapon_skills[skill];
    if (!skillData) return;
    if (skill !== P_NONE && skillData.skill !== P_ISRESTRICTED) {
        const advance_before = can_advance(skill, false);
        // P_ADVANCE is unsigned short (skills.h), including on subtraction.
        skillData.advance = (skillData.advance + degree) & 0xffff;
        if (!advance_before && can_advance(skill, false))
            await give_may_advance_msg(skill);
    }
}

/* give_may_advance_msg(skill) — C ref: weapon.c:76-84:
 *     You_feel("more confident in your %sskills.",
 *              (skill == P_NONE) ? ""
 *                  : (skill <= P_LAST_WEAPON) ? "weapon "
 *                      : (skill <= P_LAST_SPELL) ? "spell casting "
 *                          : "fighting ");
 *     (void) handle_tip(TIP_ENHANCE);
 * Both message APIs are async in JS; preserve C's sequential calls. */
async function give_may_advance_msg(skill) {
    const which = (skill === P_NONE) ? ''
                : (skill <= P_LAST_WEAPON) ? 'weapon '
                : (skill <= P_LAST_SPELL) ? 'spell casting '
                : 'fighting ';
    await You_feel_uh('more confident in your ' + which + 'skills.');
    await handle_tip(TIP_ENHANCE);
}

/* setmnotwielded(mon, obj) — C ref: weapon.c:1808-1824.
 * Clear weapon-wielded status on an object, with artifact-light handling. */
export function setmnotwielded(mon, obj) {
    if (!obj)
        return;
    if (artifact_light(obj) && obj.lamplit) {
        end_burn(obj, false);
        if (canseemon(mon))
            pline("%s in %s %s %s shining.", The(xname(obj)),
                  s_suffix(mon_nam(mon)), mbodypart(mon, HAND),
                  otense(obj, "stop"));
    }
    if (mon && mon.mw === obj)
        mon.mw = null;
    obj.owornmask = (obj.owornmask | 0) & ~W_WEP;
}

/* mwepgone(mon) — C ref: weapon.c
 * When a monster's weapon is gone, clear wielded state and set weapon_check. */
export function mwepgone(mon) {
    let mwep = mon.mw; /* C weapon.c:940: MON_WEP survives inventory extraction. */
    if (mwep) {
        setmnotwielded(mon, mwep);
        mon.weapon_check = 1;  /* NEED_WEAPON */
    }
}

/* special_dmgval(magr, mdef, armask, silverhit_p) — C ref: weapon.c:360-432.
 * objects[].oc_material SILVER = 14 (objclass.h). */
const SPD_SILVER = 14;

function _spd_is_you(mon) {
    return mon === game.youmonst
        || (game.youmonst && mon.m_id === game.youmonst.m_id);
}

function _spd_which_armor(mon, flag) {
    return which_armor(mon, flag);
}

export function special_dmgval(magr, mdef, armask, silverhit_p) {
    const left_ring = (armask & W_RINGL) ? true : false;
    const right_ring = (armask & W_RINGR) ? true : false;
    let silverhit = 0;
    let bonus = 0;

    let obj = null;
    if (armask & (W_ARMC | W_ARM | W_ARMU)) {
        if ((armask & W_ARMC) !== 0 && (obj = _spd_which_armor(magr, W_ARMC)) != null)
            armask = W_ARMC;
        else if ((armask & W_ARM) !== 0 && (obj = _spd_which_armor(magr, W_ARM)) != null)
            armask = W_ARM;
        else if ((armask & W_ARMU) !== 0 && (obj = _spd_which_armor(magr, W_ARMU)) != null)
            armask = W_ARMU;
        else
            armask = 0;
    } else if (armask & (W_ARMG | W_RINGL | W_RINGR)) {
        armask = ((obj = _spd_which_armor(magr, W_ARMG)) != null) ? W_ARMG : 0;
    } else {
        obj = _spd_which_armor(magr, armask);
    }

    if (obj) {
        if ((obj.blessed | 0) && mon_hates_blessings(mdef))
            bonus += rnd(4);
        if ((MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0) === SPD_SILVER
            && mon_hates_silver(mdef)) {
            bonus += rnd(20);
            silverhit |= armask;
        }
    } else if ((left_ring || right_ring) && _spd_is_you(magr)) {
        const u = game.u;
        if (left_ring && u.uleft) {
            if ((MKOBJ_OC_MATERIAL[u.uleft.otyp | 0] | 0) === SPD_SILVER
                && mon_hates_silver(mdef)) {
                bonus += rnd(20);
                silverhit |= W_RINGL;
            }
        }
        if (right_ring && u.uright) {
            if ((MKOBJ_OC_MATERIAL[u.uright.otyp | 0] | 0) === SPD_SILVER
                && mon_hates_silver(mdef)) {
                if (!(silverhit & W_RINGL))
                    bonus += rnd(20);
                silverhit |= W_RINGR;
            }
        }
    }

    if (silverhit_p)
        silverhit_p.value = silverhit;
    return bonus;
}

function sr_oc_bimanual(otyp) { return SR_BIMANUAL.has(otyp | 0) ? 1 : 0; }

/* mondata.h flag macros (read mon->data->mflags{1,2}). */
function sr_throws_rocks(data) { return ((data.mflags2 | 0) & SR_M2_ROCKTHROW) !== 0; }

function sr_strongmonst(data) { return ((data.mflags2 | 0) & SR_M2_STRONG) !== 0; }

function sr_likes_gems(data)   { return ((data.mflags2 | 0) & SR_M2_JEWELS) !== 0; }

/* weapon.c:475 oselect — pick the first minvent obj of a given type the
 * monster can safely wield/throw (file-static helper of select_rwep). */
async function oselect(mtmp, type) {
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) !== (type | 0))
            continue;
        /* never select non-cockatrice corpses */
        if ((type === SR_CORPSE || type === SR_EGG)
            && ((otmp.corpsenm | 0) === SR_NON_PM
                || !sr_touch_petrifies(otmp.corpsenm | 0)))
            continue;
        if (!await can_touch_safely(mtmp, otmp))
            continue;
        return otmp;
    }
    return null;
}

const SR_hands_obj = {}; /* &hands_obj sentinel: "doesn't need a propellor" */

/* C's gp.propellor (weapon.c:531) — a global that select_rwep writes and
 * mon_wield_item's NEED_RANGED_WEAPON case reads back as the object to WIELD
 * (the bow/sling/crossbow, not the missile).  It was a function-local here, so
 * that case had no way to see it. */
let SR_propellor = null;

export async function select_rwep(mtmp) {
    let otmp;
    const mlet = mtmp.data.mlet;

    SR_propellor = SR_hands_obj;
    if ((otmp = await oselect(mtmp, SR_EGG)) != null) /* cockatrice egg */
        return otmp;
    if (mlet === SR_S_KOP) /* pies are first choice for Kops */
        if ((otmp = await oselect(mtmp, SR_CREAM_PIE)) != null)
            return otmp;
    if (sr_throws_rocks(mtmp.data)) /* ...boulders for giants */
        if ((otmp = await oselect(mtmp, SR_BOULDER)) != null)
            return otmp;

    const mwep = sr_MON_WEP(mtmp);
    /* NO_WEAPON_WANTED means we already tried to wield and failed */
    const mweponly = mwelded(mwep) && (mtmp.weapon_check | 0) === SR_NO_WEAPON_WANTED;
    if (dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 13
        && couldsee(mtmp.mx, mtmp.my)) {
        if (is_art(mwep, SR_ART_SNICKERSNEE)) {
            SR_propellor = mwep;
            return mwep;
        }

        for (let i = 0; i < SR_pwep.length; i++) {
            if (((sr_strongmonst(mtmp.data)
                  && ((mtmp.misc_worn_check | 0) & SR_W_ARMS) === 0)
                 || !sr_oc_bimanual(SR_pwep[i]))
                && (sr_oc_material(SR_pwep[i]) !== SR_SILVER
                    || !mon_hates_silver(mtmp))) {
                if ((otmp = await oselect(mtmp, SR_pwep[i])) != null
                    && (otmp === mwep || !mweponly)) {
                    SR_propellor = otmp; /* force the monster to wield it */
                    return otmp;
                }
            }
        }
    }
    /* Next, try to select a throw-and-return weapon. */
    for (let i = 0; i < SR_arwep.length; i++) {
        const arw = SR_arwep[i];

        if (!sr_mindless(mtmp.data) && !sr_is_animal(mtmp.data) && !mweponly
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= arw.range
            && couldsee(mtmp.mx, mtmp.my)) {
            if ((((mtmp.misc_worn_check | 0) & SR_W_ARMS) === 0
                 || !sr_oc_bimanual(arw.otyp))
                && (sr_oc_material(arw.otyp) !== SR_SILVER
                    || !mon_hates_silver(mtmp))) {
                if ((otmp = await oselect(mtmp, arw.otyp)) != null
                    && (otmp === mwep || !mweponly)) {
                    SR_propellor = otmp; /* force the monster to wield it */
                    return otmp;
                }
            }
        }
    }

    /* other than the specific cases above, always select the most potent
     * ranged weapon to hand. */
    for (let i = 0; i < SR_rwep.length; i++) {
        /* shooting gems from slings; this goes just before the darts */
        if (SR_rwep[i] === SR_DART && !sr_likes_gems(mtmp.data)
            && m_carrying(mtmp, SR_SLING)) { /* SR_propellor */
            for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
                if ((otmp.oclass | 0) === SR_GEM_CLASS
                    && ((otmp.otyp | 0) !== SR_LOADSTONE || !(otmp.cursed | 0))) {
                    SR_propellor = m_carrying(mtmp, SR_SLING);
                    return otmp;
                }
        }

        /* KMH -- This belongs here so darts will work */
        SR_propellor = SR_hands_obj;

        const prop = sr_oc_skill(SR_rwep[i]);
        if (prop < 0) {
            switch (-prop) {
            case SR_P_BOW:
                SR_propellor = await oselect(mtmp, SR_YUMI);
                if (!SR_propellor)
                    SR_propellor = await oselect(mtmp, SR_ELVEN_BOW);
                if (!SR_propellor)
                    SR_propellor = await oselect(mtmp, SR_BOW);
                if (!SR_propellor)
                    SR_propellor = await oselect(mtmp, SR_ORCISH_BOW);
                break;
            case SR_P_SLING:
                SR_propellor = await oselect(mtmp, SR_SLING);
                break;
            case SR_P_CROSSBOW:
                SR_propellor = await oselect(mtmp, SR_CROSSBOW);
            }
            if ((otmp = sr_MON_WEP(mtmp)) && mwelded(otmp) && otmp !== SR_propellor
                && (mtmp.weapon_check | 0) === SR_NO_WEAPON_WANTED)
                SR_propellor = null;
        }
        /* SR_propellor = obj, SR_propellor to use
         * SR_propellor = &hands_obj, doesn't need a SR_propellor
         * SR_propellor = 0, needed one and didn't have one */
        if (SR_propellor != null) {
            if (SR_rwep[i] !== SR_LOADSTONE) {
                /* Don't throw a cursed weapon-in-hand or an artifact */
                if ((otmp = await oselect(mtmp, SR_rwep[i])) && !(otmp.oartifact | 0)
                    && !(otmp === sr_MON_WEP(mtmp) && mwelded(otmp)))
                    return otmp;
            } else {
                for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
                    if ((otmp.otyp | 0) === SR_LOADSTONE && !(otmp.cursed | 0))
                        return otmp;
                }
            }
        }
    }

    /* failure */
    return null;
}

/* mondata.h:107 is_giant(ptr) — M2_GIANT. */
function sh_is_giant(data) { return ((data?.mflags2 | 0) & SH_M2_GIANT) !== 0; }

/* weapon.c:704 select_hwep — select a hand to hand weapon for the monster. */
export async function select_hwep(mtmp) {
    let otmp;
    const strong = sr_strongmonst(mtmp.data);
    const wearing_shield = ((mtmp.misc_worn_check | 0) & SR_W_ARMS) !== 0;

    /* prefer artifacts to everything else */
    for (otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === OCLASS_WEAPON_SH && (otmp.oartifact | 0)
            && await touch_artifact_sh(otmp, mtmp)
            && ((strong && !wearing_shield) || !sh_oc_bimanual(otmp.otyp)))
            return otmp;
    }

    if (sh_is_giant(mtmp.data)) { /* giants just love to use clubs */
        if ((otmp = await oselect(mtmp, SH_CLUB)) != null) return otmp;
    } else if ((mtmp.mnum | 0) === PM_BALROG && game.u?.uwep) {
        if ((otmp = await oselect(mtmp, SH_BULLWHIP)) != null) return otmp;
    }

    /* only strong monsters can wield big (esp. long) weapons */
    /* big weapon is basically the same as bimanual */
    /* all monsters can wield the remaining weapons */
    for (let i = 0; i < SH_hwep.length; i++) {
        if (SH_hwep[i] === SR_CORPSE && ((mtmp.misc_worn_check | 0) & SH_W_ARMG) === 0
            && !sh_resists_ston(mtmp))
            continue;
        if (((strong && !wearing_shield) || !sh_oc_bimanual(SH_hwep[i]))
            && (sr_oc_material(SH_hwep[i]) !== SR_SILVER
                || !mon_hates_silver(mtmp))) {
            if ((otmp = await oselect(mtmp, SH_hwep[i])) != null) return otmp;
        }
    }

    /* failure */
    return null;
}

async function touch_artifact_sh(otmp, _mtmp) {
    return await touch_artifact_real(otmp, _mtmp);
}

/* weapon.c:797-933 mon_wield_item — let a monster try to wield a weapon, based
 * on mon->weapon_check.  Returns 1 if the monster took time to do it, 0 if it
 * did not.  RNG-free in C, and RNG-free here: its whole effect on a replay is
 * the "%s wields %s!" topline plus the control-flow return that makes
 * mattackm() (mhitm.c:408-412) and dochug() (monmove.c:857) abandon the rest
 * of the monster's action for this move. */
export async function mon_wield_item(mon) {
    let obj;
    let exclaim = true; /* assume mon is planning to attack */

    /* This case actually should never happen */
    if ((mon.weapon_check | 0) === SH_NO_WEAPON_WANTED)
        return 0;
    switch (mon.weapon_check | 0) {
    case SH_NEED_HTH_WEAPON:
        obj = await select_hwep(mon);
        break;
    case SH_NEED_RANGED_WEAPON:
        await select_rwep(mon); /* C: (void) select_rwep(mon) — called for its gp.propellor side effect */
        obj = SR_propellor;
        break;
    case SH_NEED_PICK_AXE:
        obj = m_carrying(mon, SH_PICK_AXE);
        /* KMH -- allow other picks */
        if (!obj && !which_armor(mon, SR_W_ARMS))
            obj = m_carrying(mon, SH_DWARVISH_MATTOCK);
        exclaim = false; /* mon is just planning to dig */
        break;
    case SH_NEED_AXE:
        /* currently, only 2 types of axe */
        obj = m_carrying(mon, SH_BATTLE_AXE);
        if (!obj || which_armor(mon, SR_W_ARMS))
            obj = m_carrying(mon, SH_AXE);
        exclaim = false;
        break;
    case SH_NEED_PICK_OR_AXE:
        /* prefer pick for fewer switches on most levels */
        obj = m_carrying(mon, SH_DWARVISH_MATTOCK);
        if (!obj)
            obj = m_carrying(mon, SH_BATTLE_AXE);
        if (!obj || which_armor(mon, SR_W_ARMS)) {
            obj = m_carrying(mon, SH_PICK_AXE);
            if (!obj)
                obj = m_carrying(mon, SH_AXE);
        }
        exclaim = false;
        break;
    default:
        impossible(`weapon_check ${mon.weapon_check} for ${mon_nam(mon)}?`);
        return 0;
    }
    if (obj && obj !== SR_hands_obj) {
        const mw_tmp = sr_MON_WEP(mon);

        if (mw_tmp && (mw_tmp.otyp | 0) === (obj.otyp | 0)) {
            /* already wielding it */
            mon.weapon_check = SH_NEED_WEAPON;
            return 0;
        }
        /* Actually, this isn't necessary--as soon as the monster
         * wields the weapon, the weapon welds itself, so the monster
         * can know it's cursed and needn't even bother trying.
         * Still....
         */
        if (mw_tmp && mwelded(mw_tmp)) {
            if (canseemon(mon)) {
                let mon_hand = mbodypart(mon, HAND);
                if (sh_oc_bimanual(mw_tmp.otyp)) mon_hand = makeplural(mon_hand);
                const welded_buf = `${otense(mw_tmp, 'are')} welded to ${mhis_sh(mon)} ${mon_hand}`;

                if ((obj.otyp | 0) === SH_PICK_AXE) {
                    await pline(`Since ${s_suffix(mon_nam(mon))} weapon${(mw_tmp.quan | 0) !== 1 ? 's' : ''} ${welded_buf},`);
                    await pline(`${mon_nam(mon)} cannot wield that ${xname(obj)}.`);
                } else {
                    await pline_mon(mon, `${Monnam(mon)} tries to wield ${await doname(obj)}.`);
                    // C weapon.c:877: Yname2 -> yname -> shk_your uses
                    // y_monnam for monster ownership (including "your" pets).
                    await pline(`${Yname2(mw_tmp)} ${welded_buf}!`);
                }
                mw_tmp.bknown = 1;
            }
            mon.weapon_check = SH_NO_WEAPON_WANTED;
            return 1;
        }
        mon.mw = obj; /* wield obj */
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = SH_NEED_WEAPON;
        if (canseemon(mon)) {
            // C weapon.c:892-906: finish each message before naming the next
            // or testing the weapon; MSGTYPE=stop can wait for input here.
            await pline_mon(mon, `${Monnam(mon)} wields ${await doname(obj)}${exclaim ? '!' : '.'}`);
            /* C weapon.c:905-918 — a cursed weapon welds as it is picked up.
             * Set W_WEP below before testing mwelded(), then retain the
             * second pline on the same topline as the wield announcement. */
            /* C weapon.c:895-897 -- the tether line follows the wield line. */
            const _arw = autoreturn_weapon(obj);
            if (_arw && _arw.tethered)
                await pline_mon(mon, `${Monnam(mon)} secures the tether on ${the_sh(xname(obj))}.`);
            // C weapon.c:904-906: only the welded test sees W_WEP here.
            obj.owornmask = (obj.owornmask | 0) | SR_W_WEP;
            const newly_welded = mwelded(obj);
            obj.owornmask &= ~SR_W_WEP;
            if (newly_welded) {
                let mon_hand = mbodypart(mon, HAND);
                if (sh_oc_bimanual(obj.otyp)) mon_hand = makeplural(mon_hand);
                await pline(`${Tobjnam_sh(obj, 'weld')} ${(obj.quan | 0) !== 1 ? 'themselves' : 'itself'} to ${s_suffix(mon_nam(mon))} ${mon_hand}!`);
                /* C weapon.c:915 — the welded weapon's curse becomes known. */
                obj.bknown = 1;
            }
        }
        /* C weapon.c:918-928 — a lit artifact (Sunsword) starts shining in the
         * monster's hand the moment it is wielded. */
        if (artifact_light(obj) && !obj.lamplit) {
            begin_burn(obj, false);
            if (canseemon(mon))
                await pline(`${Tobjnam_sh(obj, 'shine')} ${arti_light_description(obj)} in ${s_suffix(mon_nam(mon))} ${mbodypart(mon, HAND)}!`);
            /* C 3.6.3: artifact might be getting wielded by invisible monst */
            else if (cansee(mon.mx | 0, mon.my | 0))
                await pline(`Light begins shining ${(dist2(mon.mx | 0, mon.my | 0, game.u.ux, game.u.uy) <= 5 * 5) ? 'nearby' : 'in the distance'}.`);
        }
        obj.owornmask = SR_W_WEP; /* C weapon.c:929, after naming and light. */
        return 1;
    }
    mon.weapon_check = SH_NEED_WEAPON;
    return 0;
}

/* Naming helpers for the three plines above; mon_nam()/Monnam() are the ported
 * do_name.c namers already defined near the top of this file. */
function mhis_sh(mon) {
    /* weapon.c:869 mhis(mon) == genders[pronoun_gender(mon, PRONOUN_HALLU)].his */
    return mhis_mon(mon);
}

/* weapon.c:680 monmightthrowwep — is 'obj' a type of weapon that any monster
 * knows how to throw? */
export function monmightthrowwep(obj) {
    for (let idx = 0; idx < SR_rwep.length; ++idx)
        if (obj.otyp === SR_rwep[idx])
            return true;
    return false;
}

/* C objclass.h:20 — enum obj_material_types LEATHER = 7 (weapon.c:304 tests
 * `objects[otyp].oc_material <= LEATHER`). */
const LEATHER_MAT = 7;
