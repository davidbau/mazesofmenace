// The turn scheduler works in the same heap as movement, combat and saves.
// Indices are supplied once from the configured record layout.
export function createTurnState(heap, layout) {
    const { movement, moved, levelChange, turnTaken, monstersMoving } = layout;
    return {
        movement: () => heap.Int16[movement],
        setMovement: value => { heap.Int16[movement] = value; },
        moved: () => heap.Int8[moved],
        setMoved: value => { heap.Int8[moved] = value; },
        levelChange: () => heap.Uint8[levelChange],
        turnTaken: () => heap.Int8[turnTaken],
        setTurnTaken: value => { heap.Int8[turnTaken] = value; },
        setMonstersMoving: value => { heap.Int8[monstersMoving] = value; },
    };
}

// Component environments use the same scheduler against their test state.
export function turnStateFor(game) {
    if (Object.hasOwn(game, 'turnState') && game.turnState)
        return game.turnState;
    return {
        movement: () => game.u.umovement,
        setMovement: value => { game.u.umovement = value; },
        moved: () => game.u.umoved,
        setMoved: value => { game.u.umoved = value; },
        levelChange: () => game.u.utotype,
        turnTaken: () => game.svc.context.move,
        setTurnTaken: value => { game.svc.context.move = value; },
        setMonstersMoving: value => { game.svc.context.mon_moving = value; },
    };
}
