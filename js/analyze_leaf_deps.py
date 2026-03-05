#!/usr/bin/env python3
"""
Analyze top-level const/let declarations initialized from imports,
find the leaf dependency files, and check for cycles among them.
"""

import os
import re
import sys
from collections import defaultdict

JS_DIR = os.path.dirname(os.path.abspath(__file__))

def get_js_files():
    return [f for f in os.listdir(JS_DIR) if f.endswith('.js') and os.path.isfile(os.path.join(JS_DIR, f))]

def parse_imports(source):
    """Return dict: imported_name -> source_module for all import statements."""
    imports = {}
    # Match: import { a, b as c, ... } from 'module'
    # Match: import defaultExport from 'module'
    # Match: import * as ns from 'module'
    import_re = re.compile(
        r'''^\s*import\s+(?:
            (\*\s+as\s+\w+)           # namespace import
            |(\w+)                     # default import
            |\{([^}]*)\}               # named imports
            |(\w+)\s*,\s*\{([^}]*)\}  # default + named
        )\s+from\s+['"]([^'"]+)['"]\s*;?\s*$''',
        re.MULTILINE | re.VERBOSE
    )
    for m in import_re.finditer(source):
        ns, default, named, default2, named2, src = m.groups()
        if ns:
            # * as foo -> foo: src
            name = ns.split('as')[1].strip()
            imports[name] = src
        if default:
            imports[default] = src
        if named:
            for item in named.split(','):
                item = item.strip()
                if not item:
                    continue
                if ' as ' in item:
                    orig, alias = item.split(' as ')
                    imports[alias.strip()] = src
                else:
                    imports[item] = src
        if default2:
            imports[default2] = src
        if named2:
            for item in named2.split(','):
                item = item.strip()
                if not item:
                    continue
                if ' as ' in item:
                    orig, alias = item.split(' as ')
                    imports[alias.strip()] = src
                else:
                    imports[item] = src
    return imports

def is_pure_literal(expr):
    """Return True if the expression is a pure literal (no identifiers)."""
    expr = expr.strip()
    # number
    if re.match(r'^-?\d+(\.\d+)?([eE][+-]?\d+)?n?$', expr):
        return True
    # string
    if re.match(r'''^(['"`]).*\1$''', expr, re.DOTALL):
        return True
    # boolean/null/undefined
    if expr in ('true', 'false', 'null', 'undefined'):
        return True
    # array/object literals - treat as non-pure if they contain identifiers
    return False

def uses_imported_name(expr, imported_names):
    """Check if expression references any imported name."""
    # Find all identifiers in the expression
    identifiers = set(re.findall(r'\b([A-Za-z_$][A-Za-z0-9_$]*)\b', expr))
    keywords = {'true', 'false', 'null', 'undefined', 'new', 'function', 'return',
                'if', 'else', 'for', 'while', 'const', 'let', 'var', 'typeof',
                'instanceof', 'in', 'of', 'this', 'class', 'extends', 'super',
                'import', 'export', 'default', 'from', 'async', 'await', 'yield',
                'try', 'catch', 'finally', 'throw', 'break', 'continue', 'switch',
                'case', 'do', 'with', 'delete', 'void', 'static', 'get', 'set'}
    identifiers -= keywords
    return bool(identifiers & imported_names)

def find_imported_sources_for_toplevel_consts(filename, source):
    """
    Find top-level const/let declarations whose init expression uses an imported name.
    Returns a set of source modules that are referenced in such declarations.
    """
    imports = parse_imports(source)
    imported_names = set(imports.keys())
    if not imported_names:
        return set()

    sources_used = set()

    # We look for top-level const/let declarations
    # Strategy: find lines at column 0 (or with no leading whitespace) starting with const/let
    # and extract the initializer, tracking which imported names appear

    # Remove block comments first
    source_no_comments = re.sub(r'/\*.*?\*/', lambda m: '\n' * m.group(0).count('\n'), source, flags=re.DOTALL)
    # Remove line comments
    source_no_comments = re.sub(r'//[^\n]*', '', source_no_comments)

    lines = source_no_comments.split('\n')

    i = 0
    while i < len(lines):
        line = lines[i]
        # Top-level const/let (no leading whitespace or minimal)
        m = re.match(r'^(const|let)\s+(\w+)\s*=\s*(.*)', line)
        if m:
            keyword, varname, rest = m.groups()
            # Collect the full initializer (may span multiple lines)
            # Simple heuristic: collect until we find a line that ends a statement
            init_expr = rest
            j = i + 1
            # Count brackets to find end of expression
            depth_paren = init_expr.count('(') - init_expr.count(')')
            depth_bracket = init_expr.count('[') - init_expr.count(']')
            depth_brace = init_expr.count('{') - init_expr.count('}')
            while (depth_paren > 0 or depth_bracket > 0 or depth_brace > 0) and j < len(lines):
                next_line = lines[j]
                init_expr += '\n' + next_line
                depth_paren += next_line.count('(') - next_line.count(')')
                depth_bracket += next_line.count('[') - next_line.count(']')
                depth_brace += next_line.count('{') - next_line.count('}')
                j += 1

            # Check if init uses any imported name
            used = set(re.findall(r'\b([A-Za-z_$][A-Za-z0-9_$]*)\b', init_expr)) & imported_names
            for name in used:
                sources_used.add(imports[name])
        i += 1

    return sources_used

def resolve_module(source_module, from_file):
    """Resolve a relative module path to a filename in JS_DIR."""
    if source_module.startswith('./') or source_module.startswith('../'):
        base = os.path.basename(source_module)
        # Try adding .js
        candidate = base if base.endswith('.js') else base + '.js'
        return candidate
    return None  # external/node module

def get_all_imports(filename, source):
    """Get all import sources from a file, resolved to local filenames."""
    imports = parse_imports(source)
    local_imports = set()
    for name, src in imports.items():
        resolved = resolve_module(src, filename)
        if resolved:
            local_imports.add(resolved)
    return local_imports

def find_cycles(nodes, edges):
    """Find cycles in a directed graph using DFS. edges: dict node -> set of neighbors."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n: WHITE for n in nodes}
    cycles = []

    def dfs(node, path):
        color[node] = GRAY
        path = path + [node]
        for neighbor in edges.get(node, set()):
            if neighbor not in color:
                continue  # not in our node set
            if color[neighbor] == GRAY:
                # Found cycle
                cycle_start = path.index(neighbor)
                cycles.append(path[cycle_start:] + [neighbor])
            elif color[neighbor] == WHITE:
                dfs(neighbor, path)
        color[node] = BLACK

    for node in nodes:
        if color[node] == WHITE:
            dfs(node, [])

    return cycles

def main():
    js_files = get_js_files()

    # Step 1 & 2: For each file, find top-level const/let inits that use imported names,
    # and record which module they come from
    file_to_leaf_sources = {}  # filename -> set of source module strings (as-written in import)
    file_to_leaf_local = {}    # filename -> set of local filenames that are leaf deps

    sources_map = {}
    for fname in js_files:
        path = os.path.join(JS_DIR, fname)
        with open(path, 'r', encoding='utf-8', errors='replace') as f:
            source = f.read()
        sources_map[fname] = source

    for fname in js_files:
        source = sources_map[fname]
        used_sources = find_imported_sources_for_toplevel_consts(fname, source)
        file_to_leaf_sources[fname] = used_sources
        # Resolve to local filenames
        local = set()
        for src in used_sources:
            resolved = resolve_module(src, fname)
            if resolved:
                local.add(resolved)
        file_to_leaf_local[fname] = local

    # Step 3: Collect the unique set of "leaf dependency files"
    # = files that some other file imports constants from for top-level init
    leaf_dep_files = set()
    for fname, deps in file_to_leaf_local.items():
        for dep in deps:
            if dep in sources_map:
                leaf_dep_files.add(dep)

    print("=" * 70)
    print("LEAF DEPENDENCY FILES (imported for top-level const/let init)")
    print("=" * 70)
    for lf in sorted(leaf_dep_files):
        print(f"  {lf}")
    print(f"\nTotal: {len(leaf_dep_files)} files\n")

    # Step 4: For each leaf dep file, what does IT import?
    leaf_imports = {}  # leaf_file -> set of local filenames it imports
    for lf in sorted(leaf_dep_files):
        source = sources_map.get(lf, '')
        local_imports = get_all_imports(lf, source)
        # Only keep imports that are in our JS_DIR
        local_imports = {f for f in local_imports if f in sources_map}
        leaf_imports[lf] = local_imports

    print("=" * 70)
    print("WHAT EACH LEAF FILE IMPORTS (local JS files only)")
    print("=" * 70)
    for lf in sorted(leaf_dep_files):
        imps = leaf_imports[lf]
        if imps:
            print(f"\n  {lf} imports:")
            for imp in sorted(imps):
                in_leaf = "(IN LEAF SET)" if imp in leaf_dep_files else "(NOT in leaf set)"
                print(f"    <- {imp}  {in_leaf}")
        else:
            print(f"\n  {lf} imports: (nothing local - true leaf)")

    # Step 5: Check for cycles among just the leaf set
    print("\n" + "=" * 70)
    print("CYCLE CHECK AMONG LEAF SET")
    print("=" * 70)

    # Build edges restricted to leaf set
    leaf_edges = {}
    for lf in leaf_dep_files:
        leaf_edges[lf] = leaf_imports[lf] & leaf_dep_files

    cycles = find_cycles(leaf_dep_files, leaf_edges)
    if cycles:
        print(f"\n  CYCLES FOUND ({len(cycles)}):")
        for cycle in cycles:
            print(f"    {' -> '.join(cycle)}")
    else:
        print("\n  No cycles among leaf set.")

    # Step 6: Leaf files that import from NON-leaf files
    print("\n" + "=" * 70)
    print("LEAF FILES THAT IMPORT FROM NON-LEAF FILES (not truly leaves)")
    print("=" * 70)
    non_true_leaves = []
    for lf in sorted(leaf_dep_files):
        non_leaf_imports = leaf_imports[lf] - leaf_dep_files
        if non_leaf_imports:
            non_true_leaves.append((lf, non_leaf_imports))

    if non_true_leaves:
        for lf, bad_imps in non_true_leaves:
            print(f"\n  {lf} imports from non-leaf:")
            for ni in sorted(bad_imps):
                print(f"    -> {ni}")
    else:
        print("\n  All leaf files are truly leaves (only import from other leaves or nothing).")

    # Also show which files use which leaf deps (summary)
    print("\n" + "=" * 70)
    print("WHICH FILES USE WHICH LEAF DEPS FOR TOP-LEVEL CONST/LET INIT")
    print("=" * 70)
    for fname in sorted(js_files):
        local_deps = file_to_leaf_local[fname]
        if local_deps:
            print(f"\n  {fname} uses:")
            for dep in sorted(local_deps):
                in_leaf = "(leaf)" if dep in leaf_dep_files else "(not in leaf set - external?)"
                print(f"    {dep}  {in_leaf}")

if __name__ == '__main__':
    main()
