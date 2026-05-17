// u_init_skills.js — weapon / spell skills at birth (skill_init) + add_weapon_skill + lose_weapon_skill,
// skill_advance / #enhance auto-pick, use_skill (practice), drain_weapon_skill (energy drain).
// C ref: weapon.c skill_init(), add_weapon_skill(), lose_weapon_skill(), can_advance(), slots_required(),
//        skill_advance(), enhance_weapon_skill() (incl. wizard speedy), menu order, use_skill(), drain_weapon_skill();
//        skills.h practice_needed_to_advance; u_init.c skills_for_role().

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    P_NONE,
    P_NUM_SKILLS,
    P_ISRESTRICTED,
    P_UNSKILLED,
    P_BASIC,
    P_SKILLED,
    P_EXPERT,
    P_LAST_WEAPON,
    P_FIRST_SPELL,
    P_LAST_SPELL,
    P_FIRST_WEAPON,
    P_TWO_WEAPON_COMBAT,
    P_BARE_HANDED_COMBAT,
    P_HEALING_SPELL,
    P_CLERIC_SPELL,
    P_ATTACK_SPELL,
    P_ENCHANTMENT_SPELL,
    P_RIDING,
    P_SKILL_LIMIT,
    P_FIRST_H_TO_H,
    P_LAST_H_TO_H,
} from './const.js';
import { DEF_SKILLS_BY_ABBR, ROLE_SPESPEC_SCHOOL } from './u_init_skill_defs.js';
import { weaponType, isAmmo } from './weapon_kind.js';
import { applySkillBasedSpellbookId } from './skill_based_spellbook.js';
import { pSkillDisplayName } from './skill_display_name.js';

/** C: skills.h #define practice_needed_to_advance(level) ((level) * (level) * 20) */
export function practiceNeededToAdvance(level) {
    return level * level * 20;
}

function weaponSkills(u) {
    if (!u.weapon_skills || u.weapon_skills.length !== P_NUM_SKILLS) {
        u.weapon_skills = Array.from({ length: P_NUM_SKILLS }, () => ({
            skill: P_ISRESTRICTED,
            max_skill: P_ISRESTRICTED,
            advance: 0,
        }));
    }
    return u.weapon_skills;
}

function pSkill(u, i) {
    return weaponSkills(u)[i].skill;
}

function pMaxSkill(u, i) {
    return weaponSkills(u)[i].max_skill;
}

function pAdvance(u, i) {
    return weaponSkills(u)[i].advance;
}

function pRestricted(u, i) {
    return pSkill(u, i) === P_ISRESTRICTED;
}

/** C: weapon.c slots_required() */
export function slotsRequired(skillIdx, u) {
    const tmp = pSkill(u, skillIdx);
    if (skillIdx <= P_LAST_WEAPON || skillIdx === P_TWO_WEAPON_COMBAT) return tmp;
    return Math.trunc((tmp + 1) / 2);
}

/** C: weapon.c can_advance(skill, speedy) — wizard + speedy skips practice / weapon_slots check. */
export function canAdvance(u, skill, speedy, g = game) {
    if (!u) return false;
    if (pRestricted(u, skill) || pSkill(u, skill) >= pMaxSkill(u, skill)) return false;
    if ((u.skills_advanced | 0) >= P_SKILL_LIMIT) return false;
    if (speedy && g.flags?.wizard) return true;
    if (speedy) return false;
    const need = practiceNeededToAdvance(pSkill(u, skill));
    return pAdvance(u, skill) >= need && (u.weapon_slots | 0) >= slotsRequired(skill, u);
}

function countCanAdvance(u, g = game) {
    let n = 0;
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        if (canAdvance(u, i, false, g)) n++;
    }
    return n;
}

/** C: weapon.c add_skills_to_menu — iteration order (fighting, weapons, spells). */
const ENHANCE_MENU_RANGES = [
    [P_FIRST_H_TO_H, P_LAST_H_TO_H],
    [P_FIRST_WEAPON, P_LAST_WEAPON],
    [P_FIRST_SPELL, P_LAST_SPELL],
];

/** C: weapon.c give_may_advance_msg(skill) — You_feel text (no handle_tip). */
export function giveMayAdvancePlineText(skill) {
    const s =
        skill === P_NONE
            ? ''
            : skill <= P_LAST_WEAPON
              ? 'weapon '
              : skill <= P_LAST_SPELL
                ? 'spell casting '
                : 'fighting ';
    return `You feel more confident in your ${s}skills.`;
}

/**
 * C: weapon.c enhance_weapon_skill — first advanceable skill in menu order.
 * @param {object} u
 * @param {boolean} [speedy]
 * @param {object} [g]
 * @returns {number|null}
 */
export function enhancePickFirstAdvanceable(u, speedy = false, g = game) {
    if (!u) return null;
    for (const [lo, hi] of ENHANCE_MENU_RANGES) {
        for (let i = lo; i <= hi; i++) {
            if (canAdvance(u, i, speedy, g)) return i;
        }
    }
    return null;
}

/**
 * C: weapon.c skill_advance(skill) — deduct slots, P_SKILL++, skill_record, spellbooks.
 * Does not reset P_ADVANCE (C leaves practice counter unchanged).
 * @param {object} u
 * @param {number} skill
 * @param {object} [g]
 * @param {{ speedy?: boolean }} [opts] — wizard speedy enhance (C enhance_weapon_skill)
 * @returns {boolean}
 */
export function skillAdvance(u, skill, g = game, opts = {}) {
    if (!u || skill <= 0 || skill >= P_NUM_SKILLS) return false;
    const speedy = opts.speedy === true && g.flags?.wizard === true;
    if (!canAdvance(u, skill, speedy, g)) return false;
    weaponSkills(u);
    u.weapon_slots = (u.weapon_slots | 0) - slotsRequired(skill, u);
    const ws = u.weapon_skills[skill];
    ws.skill += 1;
    if (ws.max_skill < ws.skill) ws.max_skill = ws.skill;
    const idx = u.skills_advanced | 0;
    if (!u.skill_record) u.skill_record = [];
    u.skill_record[idx] = skill;
    u.skills_advanced = idx + 1;
    if (skill >= P_FIRST_SPELL && skill <= P_LAST_SPELL) applySkillBasedSpellbookId(g);
    return true;
}

/**
 * `#enhance` via extcmd: one normal step, or wizard **speedy** loop (C `enhance_weapon_skill`).
 * @param {object} [g]
 * @param {{ speedy?: boolean }} [opts]
 * @returns {{ ok: boolean, plines: string[] }}
 */
export function enhanceWeaponSkillOneStep(g = game, opts = {}) {
    const u = g.u;
    if (!u) return { ok: false, plines: [] };
    const speedy = opts.speedy === true && g.flags?.wizard === true;
    const plines = [];

    if (speedy) {
        for (;;) {
            const sk = enhancePickFirstAdvanceable(u, true, g);
            if (sk == null) break;
            if (!skillAdvance(u, sk, g, { speedy: true })) break;
            const ws = u.weapon_skills[sk];
            const atMax = ws.skill >= ws.max_skill;
            const name = pSkillDisplayName(sk, g);
            plines.push(`You are now ${atMax ? 'most' : 'more'} skilled in ${name}.`);
            let more = false;
            for (let i = 0; i < P_NUM_SKILLS; i++) {
                if (canAdvance(u, i, true, g)) {
                    more = true;
                    break;
                }
            }
            if (more) plines.push('You feel you could be more dangerous!');
            else break;
        }
        return plines.length ? { ok: true, plines } : { ok: false, plines: [] };
    }

    const sk = enhancePickFirstAdvanceable(u, false, g);
    if (sk == null) return { ok: false, plines: [] };
    if (!skillAdvance(u, sk, g)) return { ok: false, plines: [] };
    const ws = u.weapon_skills[sk];
    const atMax = ws.skill >= ws.max_skill;
    const name = pSkillDisplayName(sk, g);
    plines.push(`You are now ${atMax ? 'most' : 'more'} skilled in ${name}.`);
    let more = false;
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        if (canAdvance(u, i, false, g)) {
            more = true;
            break;
        }
    }
    if (more) plines.push('You feel you could be more dangerous!');
    return { ok: true, plines };
}

/** Pending pline from add_weapon_skill → give_may_advance_msg (flush in moveloop_preamble). */
export function takePendingGiveMayAdvancePline(g = game) {
    const s = g._giveMayAdvancePline;
    if (s) delete g._giveMayAdvancePline;
    return s || '';
}

/** Pending You() lines from drain_weapon_skill (flush in moveloop_preamble). */
export function takePendingDrainForgetPlines(g = game) {
    const q = g._drainForgetPlines;
    if (!q?.length) return [];
    delete g._drainForgetPlines;
    return q.slice();
}

/**
 * C: weapon.c use_skill(skill, degree) — P_ADVANCE += degree; give_may_advance_msg on threshold cross.
 * @param {object} u
 * @param {number} skill
 * @param {number} degree
 * @param {object} [g]
 */
export function useSkill(u, skill, degree, g = game) {
    if (!u || !degree) return;
    if (skill === P_NONE || pRestricted(u, skill)) return;
    weaponSkills(u);
    const advanceBefore = canAdvance(u, skill, false, g);
    const ws = u.weapon_skills[skill];
    ws.advance = (ws.advance | 0) + degree;
    if (!advanceBefore && canAdvance(u, skill, false, g)) {
        g._giveMayAdvancePline = giveMayAdvancePlineText(skill);
    }
}

/**
 * C: weapon.c drain_weapon_skill(n) — random popped skill_record entries, P_SKILL--, slot refund, P_ADVANCE trim, You() per skill.
 * @param {object} u
 * @param {number} n
 * @param {object} [g]
 */
export function drainWeaponSkill(u, n, g = game) {
    if (!u || n <= 0) return;
    weaponSkills(u);
    if (!u.skill_record) u.skill_record = [];
    const tmpskills = new Uint8Array(P_NUM_SKILLS);

    for (let iter = 0; iter < n; iter++) {
        const adv = u.skills_advanced | 0;
        if (adv <= 0) break;
        const i = rn2(adv);
        const skill = u.skill_record[i];
        if (skill == null || skill <= 0 || skill >= P_NUM_SKILLS) break;
        if (pSkill(u, skill) <= P_UNSKILLED) break; /* C: panic — corrupt state */

        tmpskills[skill] = 1;
        for (let j = i; j < adv - 1; j++) u.skill_record[j] = u.skill_record[j + 1];
        u.skill_record[adv - 1] = undefined;
        u.skills_advanced = adv - 1;

        const ws = weaponSkills(u)[skill];
        ws.skill -= 1;
        if (ws.max_skill < ws.skill) ws.max_skill = ws.skill;
        u.weapon_slots = (u.weapon_slots | 0) + slotsRequired(skill, u);

        const lvl = ws.skill;
        const curradv = practiceNeededToAdvance(lvl);
        const prevadv = practiceNeededToAdvance(lvl - 1);
        if (ws.advance >= curradv) {
            ws.advance = prevadv + rn2(curradv - prevadv);
        }
    }

    const lines = [];
    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        if (!tmpskills[skill]) continue;
        const some = pSkill(u, skill) >= P_BASIC ? 'some of ' : '';
        const name = pSkillDisplayName(skill, g);
        lines.push(`You forget ${some}your training in ${name}.`);
    }
    if (lines.length) {
        if (!g._drainForgetPlines) g._drainForgetPlines = [];
        g._drainForgetPlines.push(...lines);
    }
}

/** C: weapon.c unrestrict_weapon_skill() */
export function unrestrictWeaponSkill(u, skill) {
    if (skill <= 0 || skill >= P_NUM_SKILLS) return;
    if (!pRestricted(u, skill)) return;
    const ws = weaponSkills(u)[skill];
    ws.skill = P_UNSKILLED;
    ws.max_skill = P_BASIC;
    ws.advance = 0;
}

/**
 * C: weapon.c add_weapon_skill(n)
 * @param {object} u
 * @param {number} n
 */
export function addWeaponSkill(u, n) {
    if (!u || n <= 0) return;
    weaponSkills(u);
    const before = countCanAdvance(u);
    u.weapon_slots = (u.weapon_slots | 0) + n;
    const after = countCanAdvance(u);
    if (before < after) {
        game._giveMayAdvancePline = giveMayAdvancePlineText(P_NONE);
    }
}

/**
 * C: weapon.c lose_weapon_skill(n)
 * @param {object} u
 * @param {number} n
 */
export function loseWeaponSkill(u, n) {
    if (!u || n <= 0) return;
    weaponSkills(u);
    if (!u.skill_record) u.skill_record = [];
    for (let iter = 0; iter < n; iter++) {
        if ((u.weapon_slots | 0) > 0) {
            u.weapon_slots = (u.weapon_slots | 0) - 1;
        } else if ((u.skills_advanced | 0) > 0) {
            u.skills_advanced = (u.skills_advanced | 0) - 1;
            const skill = u.skill_record[u.skills_advanced];
            if (skill == null || skill <= 0 || skill >= P_NUM_SKILLS) continue;
            if (pSkill(u, skill) <= P_UNSKILLED) {
                /* C: impossible / panic — leave state consistent */
                u.skills_advanced = (u.skills_advanced | 0) + 1;
                continue;
            }
            const ws = weaponSkills(u)[skill];
            ws.skill -= 1;
            if (ws.max_skill < ws.skill) ws.max_skill = ws.skill;
            ws.advance = practiceNeededToAdvance(ws.skill - 1);
            u.weapon_slots = slotsRequired(skill, u) - 1;
        }
    }
}

/**
 * C: weapon.c skill_init() — gi.invent weapon_type pass (skip is_ammo); skill_based_spellbook_id (Wiz);
 * no pauper_reinit (u.uroleplay.pauper not modeled).
 * @param {object} [g]
 */
export function applySkillInit(g = game) {
    const u = g.u;
    if (!u) return;
    weaponSkills(u);
    u.skills_advanced = u.skills_advanced | 0;
    u.weapon_slots = u.weapon_slots | 0;
    if (!u.skill_record) u.skill_record = [];

    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        const ws = u.weapon_skills[skill];
        ws.skill = P_ISRESTRICTED;
        ws.max_skill = P_ISRESTRICTED;
        ws.advance = 0;
    }

    /* C: skill_init — carried weapons (not launcher ammo) start at Basic */
    for (let obj = g.invent; obj; obj = obj.nobj) {
        if (isAmmo(obj)) continue;
        const sk = weaponType(obj);
        if (sk !== P_NONE) u.weapon_skills[sk].skill = P_BASIC;
    }

    /* C: skill_init — magic roles start with a spell school at Basic */
    const abbr = g.urole?.abbr;
    if (abbr === 'Hea' || abbr === 'Mon') u.weapon_skills[P_HEALING_SPELL].skill = P_BASIC;
    else if (abbr === 'Pri') u.weapon_skills[P_CLERIC_SPELL].skill = P_BASIC;
    else if (abbr === 'Wiz') {
        u.weapon_skills[P_ATTACK_SPELL].skill = P_BASIC;
        u.weapon_skills[P_ENCHANTMENT_SPELL].skill = P_BASIC;
    }

    const defList = DEF_SKILLS_BY_ABBR[abbr] || DEF_SKILLS_BY_ABBR.Tou;
    for (const row of defList) {
        const skmax = row[1];
        const skill = row[0];
        if (skill === P_NONE) break;
        u.weapon_skills[skill].max_skill = skmax;
        if (u.weapon_skills[skill].skill === P_ISRESTRICTED) u.weapon_skills[skill].skill = P_UNSKILLED;
    }

    if (pMaxSkill(u, P_BARE_HANDED_COMBAT) > P_EXPERT) u.weapon_skills[P_BARE_HANDED_COMBAT].skill = P_BASIC;

    /* C: Knight starts with pony */
    if (abbr === 'Kni') u.weapon_skills[P_RIDING].skill = P_BASIC;

    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        if (!pRestricted(u, skill)) {
            const ws = u.weapon_skills[skill];
            if (ws.max_skill < ws.skill) ws.max_skill = ws.skill;
            ws.advance = practiceNeededToAdvance(ws.skill - 1);
        }
    }

    const school = abbr && ROLE_SPESPEC_SCHOOL[abbr];
    if (school != null) unrestrictWeaponSkill(u, school);

    /* C: weapon.c skill_init — if (!u.uroleplay.pauper) skill_based_spellbook_id(); */
    applySkillBasedSpellbookId(g);
}
