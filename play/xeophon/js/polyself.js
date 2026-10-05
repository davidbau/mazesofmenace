import { game } from './gstate.js';
import { A_STR, In_endgame } from './const.js';
import { AD_ELEC, AD_FIRE, MONS, PM_FLESH_GOLEM, PM_IRON_GOLEM, PM_GRAY_DRAGON, S_DRAGON, is_golem, is_male, is_female, is_neuter } from './permonst.js';
import { pmOf } from './mhitm.js';
import { d, rnd, rn2 } from './rng.js';
import { GOLEM_HP, isHomeElemental } from './makemon.js';
import { indefiniteArticle } from './objnam.js';

// polymon starts each form from the saved human gender. Only the ordinary
// polyself path permits a random change; fixed-sex species always enforce it.
export function heroFormGenderMessage(species, sexChangeAllowed) {
    const u = game.u;
    game.flags ??= {};
    const female = !!(game.flags.female ?? game._startup_gender === 'female');
    if (u._polyself_form) game.flags.female = u.mfemale ?? u._polyself_base?.female ?? female;
    else u.mfemale = game.flags.female = female;
    const maleOnly = is_male(species), femaleOnly = is_female(species);
    const lycanthrope = u.ulycn === species.pm || u.ulycn === species.name;
    const change = maleOnly ? game.flags.female : femaleOnly ? !game.flags.female
        : !is_neuter(species) && !lycanthrope && sexChangeAllowed && !rn2(10);
    if (change) game.flags.female = !game.flags.female;
    const same = u._polyself_form?.name === species.name;
    const prefix = change && !maleOnly && !femaleOnly ? game.flags.female ? 'female ' : 'male ' : '';
    const name = (same ? 'new ' : '') + prefix + (species.names?.[game.flags.female ? 1 : 0] || species.name);
    return `You ${same ? 'feel like' : 'turn into'} ${indefiniteArticle(name)}${name}!`;
}

// polyself.c:polymon uses the species level without the monster creation
// adjustment, and without newmonhp's minimum-roll HP bonus.
export function heroFormHitPoints(species) {
    const level = species.lvl;
    if (species.mlet === S_DRAGON && species.pm >= PM_GRAY_DRAGON)
        return In_endgame(game.u.uz) ? 8 * level : 4 * level + d(level, 4);
    if (is_golem(species)) return GOLEM_HP.get(species.name);
    const hp = level ? d(level, 8) : rnd(4);
    return isHomeElemental(species) ? 3 * hp : hp;
}

// polyself.c:ugolemeffects. Healing precedes feedback; Strength exercise waits
// until that feedback returns. Hero forms do not inherit monster speed changes.
export function resumeHeroGolemEffects(state, D) {
    if (!state.phase) {
        state.phase = 'done';
        const u = game.u;
        const species = u._polyself_form ? pmOf({ data: u._polyself_form }) : MONS[u.umonnum];
        const heal = state.damtype === AD_ELEC && species?.pm === PM_FLESH_GOLEM
            ? Math.trunc((state.damage + 5) / 6)
            : state.damtype === AD_FIRE && species?.pm === PM_IRON_GOLEM ? state.damage : 0;
        const hp = u.mh != null && u.mhmax != null ? 'mh' : 'uhp';
        const max = hp === 'mh' ? u.mhmax : u.uhpmax;
        if (heal && u[hp] < max) {
            u[hp] = Math.min(max, u[hp] + heal);
            (game.disp ??= {}).botl = true;
            state.phase = 'exercise';
            if (!D.say('Strangely, you feel better than before.')) return false;
        }
    }
    if (state.phase === 'exercise') {
        state.phase = 'done';
        D.exerciseAttribute(A_STR, true);
    }
    return true;
}
