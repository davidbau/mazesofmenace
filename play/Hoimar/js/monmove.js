import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dog_move } from './dog.js';

const NORMAL_SPEED = 12;
const MSLOW = 1;
const MFAST = 2;

export function mcalcmove(mtmp, m_moving) {
    let mmove = mtmp.data.mmove;

    // C ref: mon.c:mcalcmove() speed adjustments.
    if (mtmp.mspeed === MSLOW) {
        if (mmove < NORMAL_SPEED) mmove = Math.trunc((2 * mmove + 1) / 3);
        else mmove = 4 + Math.trunc(mmove / 3);
    } else if (mtmp.mspeed === MFAST) {
        mmove = Math.trunc((4 * mmove + 2) / 3);
    }

    if (m_moving) {
        const mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj) {
            mmove += NORMAL_SPEED;
        }
    }
    return mmove;
}

export function distfleeck(mtmp) {
    // C ref: monmove.c:538
    // boolean sawscary = FALSE, bravegremlin = (rn2(5) == 0);
    rn2(5); // bravegremlin check
    
    // We don't have Elbereth yet, so just return not scared
    return false; 
}

function is_wanderer(mtmp) {
    // C ref: mondata.h:is_wanderer() checks M2_WANDER.  The generated
    // monster table does not carry mflags2 yet, so explicit pet data marks
    // upstream wanderers such as kittens and ponies.
    return !!mtmp.data?.m2_wander;
}

function m_everyturn_effect(mtmp) {
    if (mtmp.data?.name === 'FOG_CLOUD') {
        rn2(3); // create_gas_cloud(..., 1, 0) TTL via rn1(3, 4)
    }
}

export async function movemon() {
    const g = game;
    let somebody_can_move = false;

    // In a real engine, we'd iterate over all monsters.
    // For now, let's just handle the monsters we have.
    for (const mtmp of g.level.monsters) {
        // C ref: mon.c:movemon_singlemon() runs this before the movement
        // budget check, so zero-budget fog clouds still leave vapor.
        m_everyturn_effect(mtmp);
        if (mtmp.movement < NORMAL_SPEED) continue;

        mtmp.movement -= NORMAL_SPEED;
        if (mtmp.movement >= NORMAL_SPEED) somebody_can_move = true;

        // dochugw -> dochug
        distfleeck(mtmp); // consuming rn2(5)
        
        // C ref: monmove.c:dochug() delegates tame monsters to
        // dogmove.c:dog_move() after the shared distfleeck() phase.
        if (mtmp.mtame) {
            if (is_wanderer(mtmp) && !rn2(4)) continue;
            dog_move(mtmp, false);
        }
    }
    
    return somebody_can_move;
}
