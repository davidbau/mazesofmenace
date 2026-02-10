# Depth 2 Room Count Divergence Investigation

## Problem
- JS creates 9 main rooms at depth 2
- C creates 7 main rooms at depth 2  
- generate_stairs_find_room calls rn2(9) in JS vs rn2(7) in C
- This causes RNG divergence at call 1336

## Key Findings

### RNG Alignment Before Divergence
- ALL 1336 RNG calls before divergence match perfectly (100%)
- This is an **algorithmic divergence**, not an RNG bug
- JS and C consume the same RNG sequence but interpret it differently

### Room Creation Pattern
- Only 2 rnd_rect() successes → makerooms loop runs exactly 2 iterations
- 7 total rn2(100) build_room checks observed
- All 9 rooms have rtype=OROOM (no THEMEROOM rooms)
- map.nsubroom = 0 (no subrooms created)

### Theme Room Analysis
Theme rooms call rn2(100) multiple times:
- nestingRooms: 3 calls (outer + middle + innermost)
- roomInRoom: 2 calls (outer + inner)
- hugeRoom: 2 calls (outer + optional inner)
- fakeDelphi: 2 calls (outer + inner)

7 total rn2(100) calls suggest theme rooms were invoked and created multiple rooms.

### Subroom Issue
Current code structure:
- `add_room_to_map()` pushes to map.rooms and sets `map.nroom = map.rooms.length`
- `add_subroom_to_map()` does NOT push to map.rooms
- Subrooms are stored only in parent's sbrooms[] array

This means:
- Subrooms are NOT in map.rooms array
- Code that iterates map.rooms can't access subrooms
- map.nroom only counts main rooms (correct)

### Attempted Fix & Blocker
Adding `map.rooms[roomIdx] = croom` to add_subroom_to_map causes:
- RNG desync from call 0 at depth 2
- C has 2565 RNG calls at depth 1, JS drops to 2474 (missing 91 calls)
- Changing `map.nroom = map.rooms.length` to increment breaks something

**Root cause of fix failure unknown** - adding subrooms to array shouldn't consume RNG.

## Hypothesis
The extra 2 main rooms (9 vs 7) may come from:
1. Theme rooms creating main rooms when they should create subrooms
2. floodFillAndRegister being called when it shouldn't be
3. Des.map() theme rooms (picks 11-29) creating multiple main rooms
4. Bug in how create_subroom fails and falls back to create_room

## Next Steps
1. Trace EXACTLY which theme room picks are selected at depth 2
2. Check if create_subroom is failing (returning null)
3. Compare C's room structure at depth 2 (if available in session data)
4. Investigate why adding subrooms to map.rooms breaks RNG
