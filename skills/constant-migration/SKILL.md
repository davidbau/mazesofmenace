---
name: constant-migration
description: Use this skill when renaming C fields to canonical names across the JS codebase (issue #227 style), including generator updates, alias patterns, and batch migration workflows.
---

# Constant Migration Skill

## When To Use
Use this when migrating JS field names to match C's canonical names from NetHack
header files — e.g., renaming `.speed` to `.mmove`, `.sub` to `.oc_subtyp`, or
`.attacks` to `.mattk`.

## Overview

Issue #227 systematically renames all JS field names to match C's canonical names.
This ensures parity with C semantics, easier debugging, and fewer subtle bugs from
inconsistent field access.

## Phases (Issue #227)

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Constant export enforcement, leaf header taxonomy | Complete |
| 2A | Attack fields (aatyp/adtyp/damn/damd) | Complete |
| 2B | Permonst unambiguous fields (mresists/mconveys/mflags1-3/msound/cwt/cnutrit/msize) | Complete |
| 2C | Permonst overloaded fields (mmove/mattk/mcolor/maligntyp) | Complete |
| 2D | Objclass fields (oc_name/oc_descr/oc_material/oc_oprop/oc_dir/oc_subtyp etc.) | Complete |
| 3 | File-per-C-source reorganization | Deferred |
| 4 | Remove set*Context wiring hacks → gstate.js singleton | Complete |

## Tools

### Python Generators (`scripts/generators/`)

**gen_monsters.py** — parses `nethack-c/include/monsters.h`, generates `js/monsters.js`:
- All ~380 monster entries in C-canonical field names
- `normalizeMonsterFields()` loop for bidirectional aliases (mlet/mlevel/m_lev/msize)
- All related constants (S_*, AT_*, AD_*, M1_*, M2_*, M3_*, MS_*, MZ_*, MR_*)

**gen_objects.py** — parses `nethack-c/include/objects.h`, generates `js/objects.js`:
- All ~450 object entries with C-canonical names
- Getter/setter alias pairs via `setAliasPair()` for mutable data
- C macro aliases (oc_skill↔oc_subtyp, oc_bimanual↔oc_bulky↔big)

**marker_patch.py** — safe regeneration utility:
- Uses `// AUTO-IMPORT-BEGIN: TAG` ... `// AUTO-IMPORT-END: TAG` markers
- Preserves manual code outside markers; replaces only auto-generated regions

### Regeneration
```bash
python3 scripts/generators/gen_monsters.py
python3 scripts/generators/gen_objects.py
```

## The Getter/Setter Alias Pattern

ObjectData is mutable (shuffled at runtime), so static aliases diverge. Use
dynamic getter/setter pairs:

```javascript
function setAliasPair(obj, canonical, alias) {
    const val = obj[canonical] ?? obj[alias];
    delete obj[canonical]; delete obj[alias];
    let _v = val;
    Object.defineProperty(obj, canonical, {
        get() { return _v; }, set(v) { _v = v; },
        enumerable: true, configurable: true
    });
    Object.defineProperty(obj, alias, {
        get() { return _v; }, set(v) { _v = v; },
        enumerable: false, configurable: true
    });
}
```

Both names always reflect the same live value, allowing gradual migration.

## Migration Workflow

### 1. Identify batch
Pick related field names (e.g., all objclass `.sub` → `.oc_subtyp`).
```bash
# Count occurrences
rg "\.oldname\b" js --type js | wc -l
```

### 2. Update generator
Edit gen_objects.py or gen_monsters.py:
- Emit C-canonical names in field declarations
- Add `setAliasPair()` or `normalizeMonsterFields()` entry for backward compat
- Regenerate and verify: `git diff js/objects.js`

### 3. Audit read-sites
```bash
rg "\.oldname\b" js --type js -n
```
Check context: is this a permonst read, objclass read, or something else?

### 4. Migrate
Replace all occurrences of legacy name with canonical name.
```javascript
// Before
const skill = objectData[obj.otyp]?.sub;
// After
const skill = objectData[obj.otyp]?.oc_subtyp;
```

### 5. Validate
```bash
npm test
node --test test/unit/constants_export_policy.test.js
rg "\.oldname\b" js --type js   # Should be empty
```

### 6. Commit
Small, atomic commits with clear field counts:
```
#227: migrate .sub → .oc_subtyp (~60 sites across 12 files)
```

## Audit Commands

```bash
# Stray capitalized exports (should be empty)
rg -n "^export (const|let|var) [A-Z]" js \
  | rg -v "js/(const|objects|monsters|artifacts|symbols|version|storage|.*_data)\.js:"

# Constants export policy test
node --test test/unit/constants_export_policy.test.js

# Find all objclass field access patterns
rg "objectData\[.*\]\." js -A 1
```

## Key Pitfalls

1. **Generator regressions**: Regeneration can drop normalization code. Always
   verify `normalizeMonsterFields()` loop is preserved.

2. **Overloaded names**: Fields like `color`, `align`, `attacks` exist on
   monsters, objects, and player. Can't use simple `replace_all` — requires
   per-file, per-context analysis.

3. **Dual PM_* system**: `const.js` has PM_KNIGHT=4 (role index 0-12),
   `monsters.js` has PM_KNIGHT=335 (monster table index 331-343). Always check
   import source.

4. **Mutable data**: ObjectData is shuffled at init. Use dynamic getter/setter
   pairs, not static aliases.

## Key Files

| File | Purpose |
|------|---------|
| `docs/ISSUE_227_EXECUTION_CHECKLIST.md` | Phase definitions, exit gates, validation |
| `docs/MODULES.md` | Constant ownership architecture, leaf files |
| `scripts/generators/gen_monsters.py` | Monster data generator |
| `scripts/generators/gen_objects.py` | Object data generator |
| `scripts/generators/marker_patch.py` | Safe regeneration utility |
| `js/const.js` | Core constants (hand-maintained leaf file) |
| `js/monsters.js` | Auto-generated monster data + aliases |
| `js/objects.js` | Auto-generated object data + getter/setter aliases |
| `test/unit/constants_export_policy.test.js` | Export policy enforcement |
