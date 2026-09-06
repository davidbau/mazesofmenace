import { game } from './gstate.js';

// Runtime objects do not all carry C's where/ocontainer/ocarry pointers.
// Resolve ownership from the live lists, including nested and migrating objects.
export function objectLocations(g = game, includeSavedLevels = false) {
    const locations = new Map();
    const visit = (list, location, parent = null) => {
        for (const obj of list || []) {
            if (!obj || locations.has(obj)) continue;
            const entry = { ...location, obj, list, parent, root: location.root || obj,
                ancestors: parent ? [...(location.ancestors || []), parent] : [] };
            if (!parent && location.source === 'floor') {
                entry.x = obj.ox;
                entry.y = obj.oy;
                entry.buried = location.buried || obj.buried;
            }
            locations.set(obj, entry);
            visit(obj.contents, entry, obj);
            if (obj.cobj !== obj.contents) visit(obj.cobj, entry, obj);
        }
    };
    const visitLevel = (level, saved = false) => {
        visit(level?.objects, { source: 'floor', level, saved });
        visit(level?.buriedobjlist, { source: 'floor', level, saved, buried: true });
        for (const owner of level?.monsters || [])
            visit(owner.minvent, { source: 'minvent', owner, level, saved, x: owner.mx, y: owner.my });
    };
    visit(g.inventory, { source: 'inventory', x: g.u?.ux, y: g.u?.uy });
    visit(g.u?.usteed?.minvent, { source: 'minvent', owner: g.u?.usteed, x: g.u?.ux, y: g.u?.uy });
    visitLevel(g.level);
    for (const list of [g.migrating_objs, g._migrating_objs]) visit(list, { source: 'migrating' });
    for (const list of [g.migrating_mons, g._migrating_mons, g._migrating_monsters]) {
        for (const owner of list || []) visit(owner.minvent, { source: 'migrating', owner });
    }
    if (g._impact_drop_migrations instanceof Map) {
        for (const list of g._impact_drop_migrations.values()) visit(list, { source: 'migrating' });
    }
    if (includeSavedLevels && g._saved_levels instanceof Map) {
        for (const saved of g._saved_levels.values()) visitLevel(saved.level || saved, true);
    }
    return locations;
}
