// u_init_ini_inv_obj_substitution_like_c.js — C u_init.c ini_inv_obj_substitution().
// C ref: u_init.c inv_subs[] + ini_inv_obj_substitution().

import { O_INIT_OC_NAME } from './o_init_objects_meta.js';
import { NON_PM } from './const.js';

/** C: permonst.h — hero race placeholders (matches js/roles.js races[].mnum). */
const PM_HUMAN = 0;
const PM_ELF = 1;
const PM_DWARF = 2;
const PM_GNOME = 3;
const PM_ORC = 4;

/** @param {string} name */
function otypFromOcNameLikeC(name) {
    const ix = O_INIT_OC_NAME.indexOf(name);
    return ix < 0 ? 0 : (ix + 1) | 0;
}

/** C: u_init.c `inv_subs[]` — `{ race_pm, item_otyp, subs_otyp }`. */
const INV_SUBS = Object.freeze([
    [PM_ELF, otypFromOcNameLikeC('dagger'), otypFromOcNameLikeC('elven dagger')],
    [PM_ELF, otypFromOcNameLikeC('spear'), otypFromOcNameLikeC('elven spear')],
    [PM_ELF, otypFromOcNameLikeC('short sword'), otypFromOcNameLikeC('elven short sword')],
    [PM_ELF, otypFromOcNameLikeC('bow'), otypFromOcNameLikeC('elven bow')],
    [PM_ELF, otypFromOcNameLikeC('arrow'), otypFromOcNameLikeC('elven arrow')],
    [PM_ELF, otypFromOcNameLikeC('helmet'), otypFromOcNameLikeC('elven leather helm')],
    [PM_ELF, otypFromOcNameLikeC('cloak of displacement'), otypFromOcNameLikeC('elven cloak')],
    [PM_ELF, otypFromOcNameLikeC('cram ration'), otypFromOcNameLikeC('lembas wafer')],
    [PM_ORC, otypFromOcNameLikeC('dagger'), otypFromOcNameLikeC('orcish dagger')],
    [PM_ORC, otypFromOcNameLikeC('spear'), otypFromOcNameLikeC('orcish spear')],
    [PM_ORC, otypFromOcNameLikeC('short sword'), otypFromOcNameLikeC('orcish short sword')],
    [PM_ORC, otypFromOcNameLikeC('bow'), otypFromOcNameLikeC('orcish bow')],
    [PM_ORC, otypFromOcNameLikeC('arrow'), otypFromOcNameLikeC('orcish arrow')],
    [PM_ORC, otypFromOcNameLikeC('helmet'), otypFromOcNameLikeC('orcish helm')],
    [PM_ORC, otypFromOcNameLikeC('small shield'), otypFromOcNameLikeC('orcish shield')],
    [PM_ORC, otypFromOcNameLikeC('ring mail'), otypFromOcNameLikeC('orcish ring mail')],
    [PM_ORC, otypFromOcNameLikeC('chain mail'), otypFromOcNameLikeC('orcish chain mail')],
    [PM_ORC, otypFromOcNameLikeC('cram ration'), otypFromOcNameLikeC('tripe ration')],
    [PM_ORC, otypFromOcNameLikeC('lembas wafer'), otypFromOcNameLikeC('tripe ration')],
    [PM_DWARF, otypFromOcNameLikeC('spear'), otypFromOcNameLikeC('dwarvish spear')],
    [PM_DWARF, otypFromOcNameLikeC('short sword'), otypFromOcNameLikeC('dwarvish short sword')],
    [PM_DWARF, otypFromOcNameLikeC('helmet'), otypFromOcNameLikeC('dwarvish iron helm')],
    [PM_DWARF, otypFromOcNameLikeC('lembas wafer'), otypFromOcNameLikeC('cram ration')],
    [PM_GNOME, otypFromOcNameLikeC('bow'), otypFromOcNameLikeC('crossbow')],
    [PM_GNOME, otypFromOcNameLikeC('arrow'), otypFromOcNameLikeC('crossbow bolt')],
]);

/**
 * C: u_init.c `ini_inv_obj_substitution(const struct trobj *trop, struct obj *obj)`.
 * @param {number} otyp
 * @param {number} raceMnum C `gu.urace.mnum`
 * @returns {number} substituted `otyp`
 */
export function iniInvObjSubstitutionLikeC(otyp, raceMnum) {
    const t = otyp | 0;
    const rm = raceMnum | 0;
    if (rm === PM_HUMAN) return t;
    for (const row of INV_SUBS) {
        if ((row[0] | 0) === NON_PM) break;
        if ((row[0] | 0) === rm && (row[1] | 0) === t) return row[2] | 0;
    }
    return t;
}

/**
 * C: `ini_inv_obj_substitution` using chargen race index.
 * @param {number} otyp
 * @param {import('./gstate.js').game} g
 * @returns {number}
 */
export function iniInvSubstOtypForChargenLikeC(otyp, g) {
    const rm = g.urace?.mnum ?? g.initraceMnum ?? 0;
    return iniInvObjSubstitutionLikeC(otyp | 0, rm | 0);
}
