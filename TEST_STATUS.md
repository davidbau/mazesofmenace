# Complete Test Status Report
**Date:** 2026-02-10
**Branch:** shops
**Commit:** 90c85e4

## Summary
- **Unit Tests:** 94/139 passing (67.6%)
- **Comparison Tests:** 41/459 passing (8.9%)
- **Combined:** 135/598 passing (22.6%)

---

## Unit Tests: 94/139 (67.6%)

### ✅ Passing (94 tests)
- RNG functionality tests
- Map generation structural tests (dimensions, connectivity, stairs)
- Object generation tests
- Monster generation tests
- Basic game mechanics

### ❌ Failing (45 tests)
**Special Level Terrain Matching:**
- Castle, Knox, Medusa, Valley, Sanctum
- Vlad Tower (levels 1-3)
- Demon lairs: Juiblex, Baalzebub, Asmodeus, Orcus
- Wizard Tower (levels 1-3)
- Sokoban (puzzles 1-4)

**Issue:** Generated levels are structurally valid (correct dimensions, walls, connectivity, stairs) but terrain layout doesn't match C exactly. Likely due to special level generation algorithm differences.

---

## Comparison Tests: 41/459 (8.9%)

### ✅ Passing (41 sessions)

**Inventory Sessions (2):**
- ✅ seed42_inventory_wizard
- ✅ seed42_inventory_wizard_pickup

**Special Level Generation (39):**
- ✅ seed1_special_* (12 levels: bigroom, castle, gehennom, knox, medusa, mines, oracle, rogue, sokoban, valley, vlad, wizard)
- ✅ seed42_special_* (12 levels: same as above)
- ✅ seed100_special_* (12 levels: same as above)
- ✅ seed200_special_sokoban
- ✅ seed300_special_sokoban
- ✅ C-vs-JS golden comparison

### ❌ Failing (418 sessions)

**Map Generation (5 seeds × depths):**
- ❌ seed16_maps_c, seed72_maps_c, seed119_maps_c, seed163_maps_c, seed306_maps_c
- **Issue:** All depths fail typGrid and RNG matching
- **Note:** Structural validation passes (dimensions, walls, corridors, stairs)
- **Root cause:** Unknown - needs investigation

**Chargen Sessions (~40):**
- ❌ All role-based character generation sessions (seed1, seed100, seed200, seed300)
- **Issue:** Screen output format mismatches
- **Note:** RNG counts are close but not exact (e.g., Knight: 145 vs expected)

**Gameplay Sessions:**
- ❌ seed1.session.json
- ❌ seed2_knight_100turns.session.json
  - ✅ Steps 0-9: PERFECT (100% RNG alignment)
  - ❌ Steps 10+: Missing zap.c obj_resists (see PROGRESS_SUMMARY.md)
  - **Overall:** 69/111 steps (62.2%)
- ❌ seed2_wizard_fountains.session.json
  - ✅ Startup: PERFECT
  - ❌ Step 1+: zap command requires zap.c implementation
- ❌ seed42.session.json, seed42_items.session.json

---

## Key Findings

### What's Working Well ✅
1. **Pet AI:** 100% RNG alignment for steps 0-9 (seed2_knight)
2. **Special Levels:** 39 sessions fully passing (sokoban, mines, oracle, etc.)
3. **Inventory Management:** seed42 inventory sessions passing
4. **Map Structure:** All structural validations pass (dimensions, connectivity)

### What Needs Work ❌
1. **Zap System:** Required for gameplay sessions step 10+ (obj_resists @ zap.c:1467)
2. **Map Generation:** 5 map seeds failing at ALL depths (typGrid + RNG mismatch)
3. **Special Level Terrain:** 25 unit tests failing due to terrain layout differences
4. **Chargen:** Screen output formatting issues

### Critical Blockers

**Priority 1: Investigate Map Generation Failures**
- All 5 map seeds (16, 72, 119, 163, 306) fail at ALL depths
- This contradicts MEMORY.md claim of "perfect depth-1 alignment"
- Structural tests pass, but RNG and terrain don't match
- **Action:** Debug seed2 or seed119 depth 1 to understand divergence

**Priority 2: Implement Zap System**
- Blocks seed2_knight steps 10+ (42 steps)
- Blocks seed2_wizard_fountains step 1+
- Requires obj_resists implementation with dynamic game state tracking
- **Estimated effort:** 2-3 days

**Priority 3: Fix Special Level Terrain**
- 25 unit tests failing (Sokoban, Wizard, Vlad, demon lairs)
- Structural validation passes, so may be minor algorithm differences
- **Estimated effort:** 1-2 days per level type

---

## Recommendations

1. **Immediate:** Investigate map generation failures
   - Run seed2 or seed119 depth 1 manually
   - Compare JS vs C typGrid and RNG traces
   - Determine if this is a test harness issue or real divergence

2. **Short-term:** Decide on priority:
   - **Option A:** Fix map generation (affects 5 seeds × multiple depths)
   - **Option B:** Implement zap.c (enables gameplay sessions)
   - **Option C:** Fix special level terrain (25 unit tests)

3. **Documentation:** Update MEMORY.md to reflect actual test status
   - Remove claim of "perfect depth-1 alignment" for map seeds
   - Add TEST_STATUS.md reference for detailed breakdown

---

## Test Execution Commands

```bash
# Unit tests
/share/u/davidbau/.nvm/versions/node/v25.6.0/bin/node --test test/unit/*.test.js

# Comparison tests
/share/u/davidbau/.nvm/versions/node/v25.6.0/bin/node --test test/comparison/*.test.js

# Specific session (e.g., seed2_knight)
cd test/comparison && node test_seed2_full.js
```
