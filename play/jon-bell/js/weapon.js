// weapon.js — C ref: weapon.c.
import { is_ammo } from './cmd.js';
import { build_window_screen, menu_search_case, menu_search_docorner } from './com_pager.js';
import { ECMD_OK, OBJ_INVENT, OBJ_MINVENT, P_ATTACK_SPELL, P_BARE_HANDED_COMBAT, P_BASIC, P_CLERIC_SPELL, P_DIVINATION_SPELL, P_ENCHANTMENT_SPELL, P_ESCAPE_SPELL, P_EXPERT, P_FIRST_H_TO_H, P_FIRST_SPELL, P_FIRST_WEAPON, P_HEALING_SPELL, P_ISRESTRICTED, P_LAST_H_TO_H, P_LAST_SPELL, P_LAST_WEAPON, P_MATTER_SPELL, P_NONE, P_NUM_SKILLS, P_RIDING, P_SKILL_LIMIT, P_UNSKILLED } from './const.js';
import { docorner_blank_utf8_captures, docrt, flush_screen, force_more, status_r1_menu_docrt } from './display.js';
import { yn_function } from './cmd.js';
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { impossible, pline, pline_mon, You_feel } from './pline.js';
import { PM_PONY } from './pm.generated.js';
import { P_NAME, P_SKILL, ROLE_CLERIC, ROLE_HEALER, ROLE_MONK, ROLE_WIZARD, SKILLS_FOR_ROLE, skillrow } from './skills.js';
import { skill_based_spellbook_id } from './spell.js';
import { menu_heading_text } from './tty_menu.js';
import { can_advance, skill_level_name, slots_required, weapon_type } from './uhitm.js';
import { THIT_OBJ_MINVENT, Your, is_wet_towel } from './cmd.js'; // relocate-fns
import { W_RINGL as W_RINGL_TO, W_RINGR as W_RINGR_TO } from './const.js'; // relocate-fns
import { canseemon } from './display.js'; // relocate-fns
import { xname } from './do_wear.js'; // relocate-fns
import { update_inventory } from './inventory_refresh.js'; // relocate-fns
import { Monnam } from './mcastu.js'; // relocate-fns
import { s_suffix } from './mhitm.js'; // relocate-fns
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js'; // relocate-fns
import { Yobjnam2, vtense } from './objnam.js'; // relocate-fns
import { mon_nam } from './uhitm.js'; // relocate-fns
import { OBJ_FREE } from './const.js'; // relocate-fns
import { newsym } from './display.js'; // relocate-fns
import { AT_WEAP, NEED_WEAPON$ } from './dogmove.js'; // relocate-fns
import { stackobj } from './sp_lev.js';
import { place_object } from './mklev.js'; // relocate-fns
import { attacktype } from './mondata.js'; // relocate-fns
import { distant_name, doname } from './objnam.js'; // relocate-fns
import { setmnotwielded } from './uhitm.js'; // relocate-fns
import { cansee } from './vision.js'; // relocate-fns
import { mwelded as mwelded_dm } from './wield.js'; // relocate-fns
import { rn2 } from './rng.js'; // relocate-fns
import { flooreffects } from './do.js';
import { bypass_obj } from './worn.js';

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
                await impossible("skill_init: curr > max: %s", P_NAME(skill));
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
                return it.heading ? menu_heading_text(body) : body;
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
            rows[i] = ' ' + (it.heading ? menu_heading_text(body) : body);
        }
        rows[page.length] = ` ${morestr}`;
        g._screen_output = rows.join('\n');
        const disp = g.nhDisplay;
        if (disp) { disp.cursorCol = 1 + morestr.length; disp.cursorRow = page.length; }
        return { start, page, morestr };
    };
    let cur = await renderPage();
    if (overlayCol) enhance_overlay = { col: overlayCol, rows: overlayRows };
    for (;;) {
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27) /* ESC — cancel */
            return 0;
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
        /* Unrecognised key: bell, no redraw, read again. */
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
export { abon } from './uhitm.js';

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
export function drain_weapon_skill(n) {
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
        pline(`You forget ${level >= P_BASIC ? 'some of ' : ''}your training in ${P_NAME(skill)}.`);
    }
}
