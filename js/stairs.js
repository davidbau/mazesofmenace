// stairs.js -- Stairway management and hero placement
// cf. stairs.c — stairway_add/free/at/find_*, u_on_upstairs/dnstairs/sstairs,
//                On_stairs/On_ladder/On_stairs_up/On_stairs_dn,
//                known_branch_stairs, stairs_description
//
// C data model: gs.stairs is a singly-linked list of stairway structs:
//   { sx, sy, up, isladder, u_traversed, tolev {dnum,dlevel}, next }
// This list holds ALL stairways on the level including branch portals.
// JS data model: map.upstair / map.dnstair are simple {x, y, isladder}
//   objects set at level generation time (sp_lev.js:3771).
//   Branch portal tracking (dnum, u_traversed) partially supported.
//
// Each stairway node returned by lookup functions has the shape:
//   { sx, sy, up, isladder, u_traversed, tolev: {dnum, dlevel} }

// ============================================================================
// Helper: build a stairway node from map.upstair or map.dnstair
// ============================================================================
function _makeStairNode(stair, up) {
    if (!stair || (stair.x === 0 && stair.y === 0)) return null;
    return {
        sx: stair.x,
        sy: stair.y,
        up: up,
        isladder: !!stair.isladder,
        u_traversed: !!stair.u_traversed,
        tolev: stair.tolev || { dnum: 0, dlevel: 0 },
    };
}

// ============================================================================
// cf. stairs.c:7 — stairway_add(x, y, up, isladder, dest)
// Registers a stairway on the map. Sets map.upstair or map.dnstair.
// ============================================================================
export function stairway_add(map, x, y, up, isladder, dest) {
    const stair = {
        x, y,
        isladder: !!isladder,
        u_traversed: false,
        tolev: dest ? { dnum: dest.dnum, dlevel: dest.dlevel } : { dnum: 0, dlevel: 0 },
    };
    if (up) {
        map.upstair = stair;
    } else {
        map.dnstair = stair;
    }
}

// cf. stairs.c:26 — stairway_free_all(): free all stairway nodes on level change
// N/A: JS uses garbage collection; map.upstair/dnstair are plain objects.

// ============================================================================
// cf. stairs.c:39 — stairway_at(x, y): find stairway at grid position
// Returns stairway node at (x, y), or null.
// ============================================================================
// TRANSLATOR: AUTO (stairs.c:39)
export function stairway_at(x, y) {
  let tmp = gs.stairs;
  while (tmp && !(tmp.sx === x && tmp.sy === y)) {
    tmp = tmp.next;
  }
  return tmp;
}

// ============================================================================
// cf. stairs.c:49 — stairway_find(fromdlev): find stairway whose tolev matches
// Returns stairway whose tolev.dnum==fromdlev.dnum && tolev.dlevel==fromdlev.dlevel.
// ============================================================================
// TRANSLATOR: AUTO (stairs.c:49)
export function stairway_find(fromdlev) {
  let tmp = gs.stairs;
  while (tmp) {
    if (tmp.tolev.dnum === fromdlev.dnum && tmp.tolev.dlevel === fromdlev.dlevel) {
      break;
    }
    tmp = tmp.next;
  }
  return tmp;
}

// ============================================================================
// cf. stairs.c:63 — stairway_find_from(fromdlev, isladder): find by dest + type
// Like stairway_find() but also matches isladder flag.
// ============================================================================
// TRANSLATOR: AUTO (stairs.c:63)
export function stairway_find_from(fromdlev, isladder) {
  let tmp = gs.stairs;
  while (tmp) {
    if (tmp.tolev.dnum === fromdlev.dnum && tmp.tolev.dlevel === fromdlev.dlevel && tmp.isladder === isladder) {
      break;
    }
    tmp = tmp.next;
  }
  return tmp;
}

// ============================================================================
// cf. stairs.c:78 — stairway_find_dir(up): find first stairway going up or down
// Returns first stairway with matching up flag.
// ============================================================================
// TRANSLATOR: AUTO (stairs.c:78)
export function stairway_find_dir(up) {
  let tmp = gs.stairs;
  while (tmp && !(tmp.up === up)) {
    tmp = tmp.next;
  }
  return tmp;
}

// ============================================================================
// cf. stairs.c:88 — stairway_find_type_dir(isladder, up): find by type+direction
// Matches both isladder and up flags.
// ============================================================================
// TRANSLATOR: AUTO (stairs.c:88)
export function stairway_find_type_dir(isladder, up) {
  let tmp = gs.stairs;
  while (tmp && !(tmp.isladder === isladder && tmp.up === up)) {
    tmp = tmp.next;
  }
  return tmp;
}

// ============================================================================
// cf. stairs.c:98 — stairway_find_special_dir(up, map, player): find branch stairway
// Returns first stairway where tolev.dnum != u.uz.dnum AND stway.up != up.
// In JS, player.dnum (or 0 if absent) represents u.uz.dnum.
// ============================================================================
// TRANSLATOR: AUTO (stairs.c:98)
export function stairway_find_special_dir(up, map) {
  let tmp = gs.stairs;
  while (tmp) {
    if (tmp.tolev.dnum !== map.uz.dnum && tmp.up !== up) return tmp;
    tmp = tmp.next;
  }
  return tmp;
}

// ============================================================================
// cf. stairs.c:112 — u_on_sstairs(upflag): place hero on special (branch) stairs
// If special stair found, place hero there; else random spot (fallback).
// ============================================================================
export function u_on_sstairs(upflag, map, player) {
    const stway = stairway_find_special_dir(upflag, map, player);
    if (stway) {
        player.x = stway.sx;
        player.y = stway.sy;
    }
    // else: u_on_rndspot — caller (getArrivalPosition) handles random fallback
}

// ============================================================================
// cf. stairs.c:124 — u_on_upstairs(): place hero on up stairway
// JS equivalent: getArrivalPosition(map, _, 'down') in do.js
// ============================================================================
export function u_on_upstairs(map, player) {
    const stway = stairway_find_dir(true, map);
    if (stway) {
        player.x = stway.sx;
        player.y = stway.sy;
    } else {
        u_on_sstairs(0, map, player); // destination upstairs implies moving down
    }
}

// ============================================================================
// cf. stairs.c:136 — u_on_dnstairs(): place hero on down stairway
// JS equivalent: getArrivalPosition(map, _, 'up') in do.js
// ============================================================================
export function u_on_dnstairs(map, player) {
    const stway = stairway_find_dir(false, map);
    if (stway) {
        player.x = stway.sx;
        player.y = stway.sy;
    } else {
        u_on_sstairs(1, map, player); // destination dnstairs implies moving up
    }
}

// ============================================================================
// cf. stairs.c:147 — On_stairs(x, y): is there any stairway at this position?
// ============================================================================
// TRANSLATOR: AUTO (stairs.c:147)
export function On_stairs(x, y) {
  return (stairway_at(x, y) !== null);
}

// ============================================================================
// cf. stairs.c:153 — On_ladder(x, y): is there a ladder (not stairs) at position?
// ============================================================================
// TRANSLATOR: AUTO (stairs.c:153)
export function On_ladder(x, y) {
  let stway = stairway_at(x, y);
  return (stway && stway.isladder);
}

// ============================================================================
// cf. stairs.c:161 — On_stairs_up(x, y): is there an up stairway at position?
// ============================================================================
// TRANSLATOR: AUTO (stairs.c:161)
export function On_stairs_up(x, y) {
  let stway = stairway_at(x, y);
  return (stway && stway.up);
}

// ============================================================================
// cf. stairs.c:169 — On_stairs_dn(x, y): is there a down stairway at position?
// ============================================================================
// TRANSLATOR: AUTO (stairs.c:169)
export function On_stairs_dn(x, y) {
  let stway = stairway_at(x, y);
  return (stway && !stway.up);
}

// ============================================================================
// cf. stairs.c:179 — known_branch_stairs(sway, player): branch-stair traversal check
// Returns true if sway is a branch staircase the hero has used.
// ============================================================================
export function known_branch_stairs(sway, player) {
    if (!sway) return false;
    const playerDnum = (player && player.dnum) || 0;
    return sway.tolev.dnum !== playerDnum && !!sway.u_traversed;
}

// ============================================================================
// cf. stairs.c:186 — stairs_description(sway, stcase, player): describe a stairway
// Returns text like "stairs up", "stairs up to level 5",
//   "branch stairs up to Gehennom", or special level-1 exit text.
// stcase: true → "staircase" (singular); false → "stairs" (plural form).
// ============================================================================
export function stairs_description(sway, stcase, player) {
    const stairs = sway.isladder ? "ladder" : stcase ? "staircase" : "stairs";
    const updown = sway.up ? "up" : "down";

    if (!known_branch_stairs(sway, player)) {
        // Ordinary stairs or branch stairs to not-yet-visited branch
        let desc = `${stairs} ${updown}`;
        if (sway.u_traversed) {
            // Append destination level depth
            const toDepth = sway.tolev.dlevel || 0;
            desc += ` to level ${toDepth}`;
        }
        return desc;
    }

    const playerDnum = (player && player.dnum) || 0;
    const playerDlevel = (player && player.dungeonLevel) || 1;

    if (playerDnum === 0 && playerDlevel === 1 && sway.up) {
        // Stairs up from level one: special case
        const hasAmulet = player && player.uhave && player.uhave.amulet;
        if (!hasAmulet) {
            return `${stairs} ${updown} out of the dungeon`;
        } else {
            return `branch ${stairs} ${updown} to the end game`;
        }
    }

    // Known branch stairs; show destination branch name
    // C uses svd.dungeons[tolev.dnum].dname; JS doesn't track dungeon names fully.
    // Use a generic description.
    const branchName = sway.tolev.dname || "a branch";
    return `branch ${stairs} ${updown} to ${branchName}`;
}
