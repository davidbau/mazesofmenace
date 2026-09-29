// C hack.c:3312 spoteffects(): effects of occupying the hero's current square.
import { game } from './gstate.js';
import { switch_terrain, pooleffects, check_special_room, ceiling } from './cmd.js';
import { dosinkfall } from './spoteffects.js';
import { float_down, hard_helmet } from './do_wear.js';
import { pickup } from './pickup.js';
import { t_at, dotrap } from './trap.js';
import { spot_time_left } from './timeout.js';
import { is_ice } from './engrave.js';
import { Warning, sensemon, pline } from './display.js';
import { Blind } from './vision.js';
import { m_at } from './uhitm.js';
import { Amonnam, x_monnam } from './mhitm.js';
import { helm_simple_name } from './objnam.js';
import { mdamageu } from './mhitu.js';
import { mnexto } from './teleport.js';
import { rn2, rnd, d } from './rng.js';
import { IS_SINK, MAX_TYPE, STONE, FAILEDUNTRAP, TIMEOUT, I_SPECIAL,
    LEVITATION, MELT_ICE_AWAY, ARTICLE_A, HALF_PHDAM, RLOC_NOMSG,
    is_pit } from './const.js';

const S_PIERCER = 16; // defsym.h

function terrain(x, y) {
    return game.level?.locations?.[x]?.[y]?.typ ?? STONE;
}

export async function spoteffects(pick) {
    const g = game, u = g.u;
    let trap = t_at(u.ux, u.uy);
    const trapflag = g.iflags?.failing_untrap ? FAILEDUNTRAP : 0;
    // C function statics belong to this game, including across nested calls.
    const state = g._spoteffectsState ||= {
        depth: 0, x: 0, y: 0, terrain: STONE, trap: null, trapType: 0,
    };
    if (state.depth && u.ux === state.x && u.uy === state.y
        && state.terrain === terrain(u.ux, u.uy)
        && (!state.trap || !trap || trap.ttyp === state.trapType)) return;
    if (g.iflags?.in_lava_effects) return;

    ++state.depth;
    state.terrain = terrain(u.ux, u.uy);
    state.x = u.ux;
    state.y = u.uy;
    try {
        if (state.terrain !== terrain(u.ux0, u.uy0)
            || g.iflags?.terrain_typ === MAX_TYPE)
            await switch_terrain();
        if (await pooleffects(true)) return;
        await check_special_room(false);

        const lev = () => u.uprops?.[LEVITATION] || {};
        const levitating = () => !!((lev().intrinsic | 0) || (lev().extrinsic | 0))
            && !(lev().blocked | 0);
        if (IS_SINK(terrain(u.ux, u.uy)) && levitating())
            await dosinkfall();

        if (!g.in_steed_dismounting) {
            if (trap && ((lev().intrinsic | 0) & TIMEOUT) === 1
                && !((lev().extrinsic | 0)
                     || ((lev().intrinsic | 0) & ~(I_SPECIAL | TIMEOUT)))) {
                if (rn2(2)) {
                    const prop = lev();
                    prop.intrinsic = ((prop.intrinsic | 0) & ~TIMEOUT)
                        | Math.min(TIMEOUT, ((prop.intrinsic | 0) & TIMEOUT) + 1);
                } else if (await float_down(I_SPECIAL | TIMEOUT, 0)) {
                    trap = null;
                    pick = false;
                }
            }
            const pit = trap && is_pit(trap.ttyp);
            if (pick && !pit) await pickup(1);
            if (trap && (!state.trap || state.trapType !== trap.ttyp)) {
                state.trap = trap;
                state.trapType = trap.ttyp;
                try {
                    await dotrap(trap, trapflag);
                } finally {
                    state.trap = null;
                    state.trapType = 0;
                }
            }
            if (pick && pit) await pickup(1);
        }

        if (Warning() && is_ice(u.ux, u.uy)) {
            const left = spot_time_left(u.ux, u.uy, MELT_ICE_AWAY);
            if (left && left < 15) {
                const warnings = ['The ice seems very soft and slushy.',
                    'You feel the ice shift beneath you!', 'The ice, is gonna BREAK!'];
                await pline(warnings[left < 5 ? 2 : left < 10 ? 1 : 0]);
            }
        }

        const mon = m_at(u.ux, u.uy);
        if (mon && !u.uswallow) {
            mon.mundetected = mon.msleeping = 0;
            if ((mon.data?.mlet | 0) === S_PIERCER) {
                await pline(`${Amonnam(mon)} suddenly drops from the ${ceiling(u.ux, u.uy)}!`);
                if (mon.mtame) {
                    // The tame piercer jumps to greet the hero.
                } else if (hard_helmet(u.uarmh)) {
                    await pline(`Its blow glances off your ${helm_simple_name(u.uarmh)}.`);
                } else if ((u.uac | 0) + 3 <= rnd(20)) {
                    await pline(`You are almost hit by ${x_monnam(mon, ARTICLE_A, 'falling', 0, true)}!`);
                } else {
                    await pline(`You are hit by ${x_monnam(mon, ARTICLE_A, 'falling', 0, true)}!`);
                    let damage = d(4, 6);
                    const half = u.uprops?.[HALF_PHDAM];
                    if ((half?.intrinsic | 0) || (half?.extrinsic | 0))
                        damage = Math.trunc((damage + 1) / 2);
                    await mdamageu(mon, damage);
                }
            } else if (mon.mtame) {
                await pline(`${Amonnam(mon)} jumps near you from the ${ceiling(u.ux, u.uy)}.`);
            } else if (mon.mpeaceful) {
                const name = Blind() && !sensemon(mon) ? 'something'
                    : x_monnam(mon, ARTICLE_A, null, 0, false);
                await pline(`You surprise ${name}!`);
                mon.mpeaceful = 0;
            } else {
                await pline(`${Amonnam(mon)} attacks you by surprise!`);
            }
            await mnexto(mon, RLOC_NOMSG);
        }
    } finally {
        if (!--state.depth) {
            state.terrain = STONE;
            state.x = state.y = 0;
        }
    }
}
