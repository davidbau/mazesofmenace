// Read the live level. The standalone engine binds these operations to its
// typed heap, while isolated ports can still supply a level as records.
export function terrainAt(game, x, y) {
    return Object.hasOwn(game, 'levelGrid') && game.levelGrid ? game.levelGrid.terrainAt(x, y) : game.levl[x][y].typ;
}

export function doorMaskAt(game, x, y) {
    return Object.hasOwn(game, 'levelGrid') && game.levelGrid ? game.levelGrid.flagsAt(x, y) : game.levl[x][y].doormask;
}

export function seenAt(game, x, y) {
    return Object.hasOwn(game, 'levelGrid') && game.levelGrid ? game.levelGrid.seenAt(x, y) : game.levl[x][y].seenv;
}
