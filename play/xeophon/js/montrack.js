export function updateMonsterTrack(mon, x = null, y = null) {
    const slots = [];
    if (x != null && y != null) slots.push({ x, y });
    for (const slot of mon?.mtrack || []) {
        if (slots.length >= 4) break;
        slots.push({ x: slot?.x || 0, y: slot?.y || 0 });
    }
    while (slots.length < 4) slots.push({ x: 0, y: 0 });
    if (mon) mon.mtrack = slots;
    return slots;
}

export function clearMonsterTrack(mon) {
    if (!mon) return [];
    mon.mtrack = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    return mon.mtrack;
}
