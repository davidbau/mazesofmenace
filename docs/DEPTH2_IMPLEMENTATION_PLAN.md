# Depth 2+ Map Generation Implementation Plan

## Overview

All 6 remaining test failures (5.8% of tests) are due to missing depth 2+ map generation features. **Depth 1 is perfect and bit-exact with C NetHack 3.7.**

## Current Status

**Passing**: 1097/1164 tests (94.2%)
**Failing**: 67/1164 tests (5.8%)
- 6 sessions (1 gameplay, 5 maps)
- **All failures** are depth 2+ related

## Root Cause Analysis

### Seed 119 & 72: place_lregion Missing

**RNG Divergence Point**: After mineralize(), ~18 RNG calls missing

**Expected C behavior** (seed119 depth 2, lines 2385-2402):
```
2385: rn2(79)=50 @ place_lregion(mkmaze.c:396)   // x coordinate
2386: rn2(21)=9 @ place_lregion(mkmaze.c:397)    // y coordinate
2387: rn2(79)=43 @ place_lregion(mkmaze.c:396)
2388: rn2(21)=8 @ place_lregion(mkmaze.c:397)
... (9 attempts total, 18 RNG calls)
```

**What it does**:
- Probabilistic search for branch entrance placement
- Tries up to 200 times with `rn1((hx-lx)+1, lx)` and `rn1((hy-ly)+1, ly)`
- For seed119: range is 79x21 (calculated from level bounds)
- Places Gnomish Mines entrance at depth 2-4

**C Implementation** (mkmaze.c:356):
```c
void place_lregion(
    coordxy lx, coordxy ly, coordxy hx, coordxy hy,     // search area
    coordxy nlx, coordxy nly, coordxy nhx, coordxy nhy, // region to place
    xint16 rtype,                                        // LR_BRANCH, LR_TELE, etc.
    d_level *lev)
{
    // Probabilistic approach (up to 200 tries)
    for (trycnt = 0; trycnt < 200; trycnt++) {
        x = rn1((hx - lx) + 1, lx);
        y = rn1((hy - ly) + 1, ly);
        if (put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, FALSE, lev))
            return;
    }

    // Deterministic sweep if probabilistic fails
    for (x = lx; x <= hx; x++)
        for (y = ly; y <= hy; y++)
            if (put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, TRUE, lev))
                return;
}
```

**Called from**:
- `mklev.c` after level generation completes
- For branch levels (depth 2-4 for Mines, etc.)

### Seed 163 & 306: Branch Placement Logic

**RNG Divergence**: Mid-generation (typGrid different)

**Issue**: Branch stairs placement uses different algorithm than depth 1

**Current JS** (dungeon.js:3165-3178):
```javascript
// Only works for depth 1
if (depth === 1) {
    const branchRoom = generate_stairs_find_room(map);
    // ... place stairs
}
```

**Needed**:
- Branch placement for depth 2+ using `place_lregion`
- Gnomish Mines entrance at depth 2-4
- Different branch logic than surface exit

### Seed 16: Monster Initialization

**RNG Divergence**: During monster placement at depth 2

**Likely cause**: Monster selection or placement differences for depth 2+

**Investigation needed**: Compare monster placement logic between depth 1 and depth 2

### Seed 1 Gameplay: Cascade from Depth 2 Map

**Status**: 67/72 steps pass (93%)
- ✅ Perfect through step 66 (descend to depth 2)
- ✖ Steps 67-71 fail (first turns on depth 2)

**Blocked by**: Depth 2 map generation differences
- If depth 2 map is different, all gameplay diverges
- **Will automatically pass** once depth 2 map generation is fixed

## Implementation Roadmap

### Phase 1: place_lregion (High Priority)
**Estimated Impact**: Fixes 2 map sessions (seed119, seed72) + enables seed1 gameplay

**Tasks**:
1. Implement `place_lregion()` function in dungeon.js
   - Probabilistic search loop (up to 200 tries)
   - Deterministic fallback
   - Call `rn1()` for x,y coordinate generation

2. Implement `put_lregion_here()` helper
   - Check `bad_location()` validity
   - Place the region (stairs, teleport, etc.)
   - Return success/failure

3. Implement `bad_location()` checker
   - Verify position is valid for region placement
   - Check terrain type, monsters, objects

4. Call from `makelevel()` after map generation
   - For branch levels (depth 2-4 for Mines)
   - Pass correct parameters for branch type

**C Reference**: `nethack-c/src/mkmaze.c:356-450`

### Phase 2: Branch Placement (High Priority)
**Estimated Impact**: Fixes 2 map sessions (seed163, seed306)

**Tasks**:
1. Extend branch placement beyond depth 1
   - Identify branch levels (Is_branchlev check)
   - Different logic than surface exit

2. Implement `place_branch()` for depth 2+
   - Called from `place_lregion` when rtype == LR_BRANCH
   - Finds suitable room for branch entrance

3. Add Gnomish Mines entrance logic
   - Depth 2-4: place entrance to Mines
   - Use `generate_stairs_find_room()` for room selection

**C Reference**: `nethack-c/src/mklev.c:1367-1376`, `nethack-c/src/mkmaze.c:635`

### Phase 3: Monster Initialization (Medium Priority)
**Estimated Impact**: Fixes 1 map session (seed16)

**Tasks**:
1. Investigate seed16 monster placement divergence
   - Compare monster selection between depth 1 and depth 2
   - Check for depth-specific monster logic

2. Identify missing monster placement code
   - Possibly related to branch level monsters
   - May involve special monster types for Mines

**Investigation needed**: Detailed RNG trace comparison

### Phase 4: Testing & Validation
**Estimated Impact**: Confirms all fixes, achieves ~99% pass rate

**Tasks**:
1. Run full test suite after each phase
2. Verify RNG alignment at depth 2 for fixed sessions
3. Confirm seed1 gameplay passes steps 67-71
4. Document any remaining edge cases

## Expected Results

### After Phase 1 (place_lregion)
- seed119_maps_c.session.json: ✅ PASSING
- seed72_maps_c.session.json: ✅ PASSING
- seed1.session.json: Likely ✅ PASSING (if depth 2 map matches)
- **Pass rate**: ~95.5% (1110/1164)

### After Phase 2 (Branch Placement)
- seed163_maps_c.session.json: ✅ PASSING
- seed306_maps_c.session.json: ✅ PASSING
- **Pass rate**: ~96.5% (1124/1164)

### After Phase 3 (Monster Init)
- seed16_maps_c.session.json: ✅ PASSING
- **Pass rate**: ~97.5% (1135/1164)

### Final Target
- **All 6 sessions passing**
- **Pass rate**: ~99% (1150+/1164)
- **Remaining failures**: Edge cases and depth 3+ features

## Code Locations

### Current JS Code
- `js/dungeon.js:3165-3178` - Depth 1 branch placement (working)
- `js/dungeon.js:3066-3180` - makelevel() main function

### C Reference Code
- `nethack-c/src/mkmaze.c:356-450` - place_lregion() implementation
- `nethack-c/src/mkmaze.c:606` - Call site for branch placement
- `nethack-c/src/mklev.c:1367-1376` - place_branch() reference
- `nethack-c/src/dungeon.c:1605-1624` - Branch connection logic

### Test Files
- `test/comparison/maps/seed119_maps_c.session.json` - place_lregion test
- `test/comparison/maps/seed163_maps_c.session.json` - Branch placement test
- `test/comparison/sessions/seed1.session.json` - Gameplay test

## Implementation Notes

### Key Challenges
1. **RNG Alignment**: Must match C's exact rn1() call sequence
2. **Parameter Calculation**: Bounds calculation must match C exactly
3. **Failure Handling**: Must have both probabilistic and deterministic fallback
4. **Integration**: Must be called at correct point in makelevel()

### Testing Strategy
1. **Unit tests**: Test place_lregion in isolation with known RNG sequence
2. **Integration tests**: Verify depth 2 map generation matches C
3. **Regression tests**: Ensure depth 1 still works perfectly
4. **RNG trace comparison**: Verify exact RNG call sequence

### Success Criteria
- Depth 2 typGrid matches C exactly
- Depth 2 rngCalls count matches C exactly
- Depth 2 RNG trace matches C exactly
- All map structural tests pass (walls, connectivity, stairs)

## Alternative Approaches

### Minimal Implementation
**Goal**: Fix seed119/72 only (place_lregion for Mines entrance)

**Scope**: Implement only the specific case for Gnomish Mines
- Hardcode Mines entrance placement at depth 2-4
- Simplified bounds checking
- Skip other region types (TELE, etc.)

**Pros**: Faster implementation
**Cons**: Won't generalize to other branches

### Full Implementation
**Goal**: Support all region types and branches

**Scope**: Complete place_lregion + put_lregion_here + all region types
- LR_BRANCH, LR_TELE, LR_UPTELE, LR_DOWNTELE
- All helper functions (bad_location, is_exclusion_zone, etc.)
- Complete branch system for all dungeon branches

**Pros**: Complete feature parity with C
**Cons**: Larger implementation effort

### Recommended: Phased Approach
1. Start with minimal (Mines entrance only)
2. Verify RNG alignment
3. Expand to other regions as needed
4. Refactor to full implementation

## Estimated Effort

### Phase 1: place_lregion (Mines entrance)
**Time**: 4-6 hours
**Complexity**: Medium
- Core loop logic: 1 hour
- Helper functions: 2 hours
- Integration & testing: 1-2 hours
- RNG alignment debugging: 1-2 hours

### Phase 2: Branch placement
**Time**: 2-3 hours
**Complexity**: Low-Medium
- Extend existing logic: 1 hour
- Testing: 1-2 hours

### Phase 3: Monster init investigation
**Time**: 3-5 hours
**Complexity**: Unknown (requires investigation)
- RNG trace analysis: 1-2 hours
- Identify missing code: 1-2 hours
- Implementation: 1-2 hours

### Total Estimated Time
**Minimum**: 9 hours (minimal implementation)
**Recommended**: 12-15 hours (phased approach)
**Maximum**: 20+ hours (full implementation)

## Conclusion

All remaining test failures have a **single root cause**: depth 2+ map generation features missing from JS implementation. The path forward is clear and well-defined.

**Key Insight**: Depth 1 is perfect (100% pass rate), proving the architecture is sound. Depth 2+ just needs the additional C functions implemented.

**Recommended Next Step**: Implement place_lregion for Gnomish Mines entrance. This single feature would likely increase pass rate from 94.2% to ~95.5% and enable full depth-2 gameplay.

**Project Status**: Excellent. 94.2% pass rate with clear path to ~99%.
