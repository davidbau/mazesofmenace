# Constant Dependency Design Doc

## Goal

Understand which C header files are "leaf" constants files (safe to import from
anywhere in JS without circular initialization risk), and which depend on
constants from other files.

## C Header Constant Cross-File Dependencies

Every case where a constant's RHS references a constant defined in another file:

### artifact.h
- from **objclass.h**: `SPFX_XRAY` uses `RAY`
- from **prop.h**: `TAMING` uses `LAST_PROP`

### botl.h
- from **color.h**: `BL_ATTCLR_MAX`, `HL_ATTCLR_*` use `CLR_MAX`
- from **global.h**: `MAXCO` uses `COLNO`; `REASSESS_ONLY` uses `TRUE`

### config.h
- from **global.h**: `CONFIG_ERROR_SECURE` uses `TRUE`
- from **objects.h**: `GEM_GRAPHICS` uses `GEM`

### dgn_file.h
- from **align.h**: `D_ALIGN_CHAOTIC/LAWFUL/NEUTRAL` use `AM_*`

### display.h
- from **sym.h**: `GLYPH_*_OFF` use `MAXEXPCHARS`, `WARNCOUNT`, `MAXTCHARS`
- from **vision.h**: guard macro only

### global.h
- from **config.h**: guard macros, `PANICTRACE`
- from **patchlevel.h**: `NH_DEVEL_STATUS`, `NH_STATUS_RELEASED`

### hack.h
- from **attrib.h**: `SHOP_WALL_DMG` uses `ACURRSTR`
- from **global.h**: `MAXLINFO` uses `MAXDUNGEON`, `MAXLEVEL`
- from **monst.h**: `MM_NOWAIT` uses `STRAT_WAITMASK`; `RLOC_NOMSG` uses `STRAT_APPEARMSG`
- from **obj.h**: `BALL_IN_MON`, `CHAIN_IN_MON` use `OBJ_FREE`
- from **permonst.h**: `UNDEFINED_RACE/ROLE` use `NON_PM`
- from **rm.h**: `CC_SKIP_INACCS` uses `ZAP_POS`
- from **sym.h**: `SYM_OFF_X` uses `WARNCOUNT`

### mextra.h
- from **align.h**: `AM_*` used in guards
- from **global.h**: `FCSIZ` uses `COLNO`, `ROWNO`

### monsters.h
- from **artilist.h**: `SEDUCTION_ATTACKS_*` use `NO_ATTK`
- from **monattk.h**: `SEDUCTION_ATTACKS_*` use `AD_*`, `AT_*`

### obj.h
- from **config.h**: `OBJ_H` uses `UNIX`

### objects.h
- from **objclass.h**: `B`, `P`, `S`, `PAPER` use `WHACK`, `PIERCE`, `SLASH`, `LEATHER`

### sp_lev.h
- from **rm.h**: `ICEDPOOLS` uses `ICED_MOAT`, `ICED_POOL`

### sym.h
- from **trap.h**: `MAXTCHARS` uses `TRAPNUM`

### you.h
- from **align.h**: `ROLE_ALIGNMASK/CHAOTIC/LAWFUL/NEUTRAL` use `AM_*`

---

## Pure Leaf Headers (no cross-file constant deps)

These headers define only self-contained constants and are safe to import
from anywhere without risk of unresolved dependencies:

```
align.h       artilist.h    attrib.h      context.h
coord.h       decl.h        defsym.h      dungeon.h
engrave.h     extern.h      flag.h        hacklib.h
integer.h     lint.h        mkroom.h      monattk.h
mondata.h     monst.h       optlist.h     patchlevel.h
quest.h       rect.h        region.h      rm.h
savefile.h    seffects.h    spell.h       stairs.h
trap.h        vision.h      warnings.h    weight.h
youprop.h     objclass.h    obj.h (mostly) prop.h    color.h
```

---

## JS Equivalent Leaf Files

Mapping the above to JS: the files that define only pure constants and are safe
to import from anywhere without circular init risk:

| C header | JS equivalent | Status |
|----------|---------------|--------|
| config.h + defsym.h + integer.h | `config.js` | ✅ leaf, no imports |
| monsters.h + monattk.h | `monsters.js` | ✅ near-leaf (→ attack_fields.js only) |
| objects.h + objclass.h | `objects.js` | ✅ leaf, no imports |
| trap.h | `config.js` (TT_* etc.) | ✅ |
| align.h | `config.js` (A_LAWFUL etc.) | ✅ |
| attrib.h | `config.js` (A_STR etc.) | ✅ |
| artilist.h | `config.js` / `artifacts.js` | check |
| rm.h | `symbols.js` | check |
| sym.h / defsym.h | `symbols.js` | check |
| hacklib.h | `hacklib.js` | ✅ leaf |

---

## Key Insight

The C constant dependency graph is **shallow** — only ~12 headers have any
cross-file constant dependencies, and those dependencies only go 1-2 levels
deep (e.g. `hack.h` → `global.h` → `config.h` → pure literals). There are
**no cycles** in the C constant dependency graph.

The JS equivalent should maintain this property: `config.js`, `monsters.js`,
`objects.js`, `symbols.js`, `hacklib.js` form the leaf tier and must never
import from gameplay modules. Everything else can freely import from these
without initialization risk.

The pervasive JS module cycles (`trap ↔ hack ↔ vision` etc.) are **not a
constant initialization problem** — they only involve function imports, which
are resolved by the time any function executes.
