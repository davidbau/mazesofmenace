// C ref: invent.c, steal.c

import { GOLD_PIECE } from './objects.js';

export function findgold(argchain) {
    let chain = argchain;
    while (chain && chain.otyp !== GOLD_PIECE) {
        chain = chain.nobj;
    }
    return chain;
}
