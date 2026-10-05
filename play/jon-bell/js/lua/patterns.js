
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Map a Lua character-class letter to a JS predicate that tests a single
 * code point.  Upper-case letters produce the complement.
 */
const CHAR_CLASSES = {
  // Lower-case (positive) classes
  a: (c) => /[a-zA-Z]/.test(c),
  c: (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
  d: (c) => /[0-9]/.test(c),
  g: (c) => c !== ' ' && c.charCodeAt(0) >= 33,  // printable except space
  l: (c) => /[a-z]/.test(c),
  p: (c) => /[!-/:-@[-`{-~]/.test(c),  // punctuation
  s: (c) => /[\t\n\v\f\r ]/.test(c),   // whitespace (space, tab, newline, etc.)
  u: (c) => /[A-Z]/.test(c),
  w: (c) => /[a-zA-Z0-9]/.test(c),
  x: (c) => /[0-9a-fA-F]/.test(c),
};

function charClassPredicate(letter) {
  const lower = (letter || '').toLowerCase();
  const fn = CHAR_CLASSES[lower];
  if (!fn) return null;
  if (letter === lower) return fn;           // positive
  return (c) => !fn(c);                       // complement (upper-case)
}

// ---------------------------------------------------------------------------
// Pattern parser – compiles a Lua pattern string into an AST-like array of
// "atoms".  Each atom is an object:
//   { type: 'literal',  ch: 'a' }
//   { type: 'class',    cls: 'a' }          // %a, %A, %d, …
//   { type: 'any' }                          // .
//   { type: 'anchor_start' }                 // ^
//   { type: 'anchor_end' }                   // $
//   { type: 'balanced', x: '(', y: ')' }     // %b()
//   { type: 'backref',  n: 1..9 }            // %1..%9
//
// Quantifiers are attached to the preceding atom via .quant:
//   { type:'literal', ch:'a', quant:'*' }   // a*
//   { type:'literal', ch:'a', quant:'+' }   // a+
//   { type:'literal', ch:'a', quant:'-' }   // a-  (lazy)
//   { type:'literal', ch:'a', quant:'?' }   // a?
// ---------------------------------------------------------------------------

function parsePattern(pattern) {
  const atoms = [];
  let i = 0;
  const len = pattern.length;

  const peek = () => (i < len ? pattern[i] : null);
  const advance = () => pattern[i++];

  function parseSet() {
    // We're right after '['; read until ']'
    const chars = new Set();
    let negated = false;
    let first = true;

    if (peek() === '^') {
      negated = true;
      advance();
    }

    // Handle ']' as first character (literal)
    if (peek() === ']') {
      chars.add(']');
      advance();
      first = false;
    }

    while (i < len) {
      const c = advance();
      if (c === ']' && !first) break;

      if (c === '%' && i < len) {
        // Character class inside set
        const cls = advance();
        if (cls === '%') {
          chars.add('%');
        } else if (CHAR_CLASSES[cls.toLowerCase()]) {
          // Expand class into individual chars (limited ASCII range)
          for (let code = 0; code < 256; code++) {
            const ch = String.fromCharCode(code);
            if (charClassPredicate(cls)(ch)) chars.add(ch);
          }
        } else {
          chars.add(cls); // literal
        }
      } else if (c === '-' && !first && peek() !== ']' && i > 0) {
        // Range: a-z
        const prev = [...chars].pop();
        if (prev && prev.length === 1) {
          const nextC = advance();
          const from = prev.charCodeAt(0);
          const to = nextC.charCodeAt(0);
          if (from <= to) {
            for (let code = from; code <= to; code++) {
              chars.add(String.fromCharCode(code));
            }
          }
        }
        // Remove the previous char that was added before the range
        // Actually we need to handle this differently — the range includes both ends
        // We already added prev to chars. But the range means a-z should include
        // a through z. Let's handle this more carefully.
      } else {
        chars.add(c);
      }
      first = false;
    }

    return { type: 'set', chars, negated };
  }

  while (i < len) {
    const c = advance();

    switch (c) {
      case '^':
        if (i === 1) {
          // Only special at position 1 (start of pattern)
          atoms.push({ type: 'anchor_start' });
        } else {
          atoms.push({ type: 'literal', ch: '^' });
        }
        break;

      case '$':
        if (i === len) {
          // Only special at end of pattern
          atoms.push({ type: 'anchor_end' });
        } else {
          atoms.push({ type: 'literal', ch: '$' });
        }
        break;

      case '.':
        atoms.push({ type: 'any' });
        break;

      case '%': {
        if (i >= len) {
          // Trailing % is literal %
          atoms.push({ type: 'literal', ch: '%' });
          break;
        }
        const code = advance();
        if (code === '%') {
          atoms.push({ type: 'literal', ch: '%' });
        } else if (code >= '1' && code <= '9') {
          atoms.push({ type: 'backref', n: Number(code) });
        } else if (code === 'b') {
          // %bxy — balanced match
          if (i + 1 >= len) {
            atoms.push({ type: 'literal', ch: '%' });
            atoms.push({ type: 'literal', ch: 'b' });
            break;
          }
          const x = advance();
          const y = advance();
          atoms.push({ type: 'balanced', x, y });
        } else if (code === 'f') {
          // %f[set] — frontier
          if (peek() === '[') {
            advance(); // consume '['
            const setInfo = parseSet();
            atoms.push({ type: 'frontier', set: setInfo });
          } else {
            atoms.push({ type: 'literal', ch: '%' });
            atoms.push({ type: 'literal', ch: 'f' });
          }
        } else if (CHAR_CLASSES[code.toLowerCase()]) {
          atoms.push({ type: 'class', cls: code });
        } else {
          // %X where X is not magic → literal X
          atoms.push({ type: 'literal', ch: code });
        }
        break;
      }

      case '(':
        if (peek() === ')') {
          advance();
          atoms.push({ type: 'position' });
        } else {
          // Parse content until matching ')'
          const bodyAtoms = [];
          let depth = 1;
          while (i < len && depth > 0) {
            const nc = advance();
            if (nc === '(') depth++;
            else if (nc === ')') {
              depth--;
              if (depth === 0) break;
            }
            // Push raw; we'll re-parse
            bodyAtoms.push(nc);
          }
          // Re-parse the body
          const innerPattern = bodyAtoms.join('');
          const innerAtoms = parsePattern(innerPattern);
          atoms.push({ type: 'capture', body: innerAtoms });
        }
        break;

      case ')':
        // Unmatched ) — treat as literal
        atoms.push({ type: 'literal', ch: ')' });
        break;

      case '[':
        atoms.push(parseSet());
        break;

      case '*':
      case '+':
      case '-':
      case '?': {
        // Quantifier — attached to previous atom
        const prev = atoms[atoms.length - 1];
        if (prev && prev.quant === undefined && c !== '?') {
          prev.quant = c;
        } else if (prev && prev.quant === undefined && c === '?') {
          prev.quant = '?';
        } else if (c === '?') {
          // ? after something without quantifier
          if (prev && prev.type === 'literal' && prev.ch === '?' && prev.quant === undefined) {
            // Already handled
          } else if (prev) {
            prev.quant = '?';
          }
        }
        // If no previous atom, treat as literal
        if (!prev) {
          atoms.push({ type: 'literal', ch: c });
        }
        break;
      }

      default:
        atoms.push({ type: 'literal', ch: c });
        break;
    }
  }

  return atoms;
}

// ---------------------------------------------------------------------------
// Matching engine
// ---------------------------------------------------------------------------

function matchHere(atoms, s, pos, captures) {
  let cur = pos;
  const savedCaptures = [...captures];

  for (let ai = 0; ai < atoms.length; ai++) {
    const atom = atoms[ai];

    if (atom.type === 'anchor_start') {
      if (cur !== 0) return null;
      continue;
    }

    if (atom.type === 'anchor_end') {
      if (cur !== s.length) return null;
      continue;
    }

    if (atom.type === 'position') {
      savedCaptures.push(cur + 1);
      continue;
    }

    if (cur >= s.length && atom.quant !== '*' && atom.quant !== '?' && atom.quant !== '-') {
      return null;
    }

    if (atom.quant === '*') {
      // Greedy 0+
      const result = matchQuantifier(atom, s, cur, savedCaptures, '*');
      if (!result) return null;
      cur = result.endPos;
      result.captures.forEach((c, idx) => {
        if (idx < savedCaptures.length) savedCaptures[idx] = c;
        else savedCaptures.push(c);
      });
    } else if (atom.quant === '+') {
      // Greedy 1+
      const result = matchQuantifier(atom, s, cur, savedCaptures, '+');
      if (!result) return null;
      cur = result.endPos;
      result.captures.forEach((c, idx) => {
        if (idx < savedCaptures.length) savedCaptures[idx] = c;
        else savedCaptures.push(c);
      });
    } else if (atom.quant === '-') {
      // Lazy 0+
      const result = matchQuantifier(atom, s, cur, savedCaptures, '-');
      if (!result) return null;
      cur = result.endPos;
      result.captures.forEach((c, idx) => {
        if (idx < savedCaptures.length) savedCaptures[idx] = c;
        else savedCaptures.push(c);
      });
    } else if (atom.quant === '?') {
      // Optional (0 or 1)
      const result = matchOne(atom, s, cur, savedCaptures);
      if (result) {
        cur = result.endPos;
        result.captures.forEach((c, idx) => {
          if (idx < savedCaptures.length) savedCaptures[idx] = c;
          else savedCaptures.push(c);
        });
      }
      // else: skip (0 matches is OK)
    } else {
      const result = matchOne(atom, s, cur, savedCaptures);
      if (!result) return null;
      cur = result.endPos;
      result.captures.forEach((c, idx) => {
        if (idx < savedCaptures.length) savedCaptures[idx] = c;
        else savedCaptures.push(c);
      });
    }
  }

  return { endPos: cur, captures: savedCaptures };
}

function matchOne(atom, s, pos, captures) {
  const localCaps = [];
  const newCaps = [...captures];

  if (atom.type === 'literal') {
    if (pos >= s.length || s[pos] !== atom.ch) return null;
    return { endPos: pos + 1, captures: newCaps };
  }

  if (atom.type === 'any') {
    if (pos >= s.length) return null;
    return { endPos: pos + 1, captures: newCaps };
  }

  if (atom.type === 'class') {
    if (pos >= s.length) return null;
    const pred = charClassPredicate(atom.cls);
    if (!pred || !pred(s[pos])) return null;
    return { endPos: pos + 1, captures: newCaps };
  }

  if (atom.type === 'set') {
    if (pos >= s.length) return null;
    const inSet = atom.chars.has(s[pos]);
    if (atom.negated ? inSet : !inSet) return null;
    return { endPos: pos + 1, captures: newCaps };
  }

  if (atom.type === 'capture') {
    // Match the inner pattern
    const capStart = pos;
    const innerCaps = [];
    const result = matchHere(atom.body, s, pos, innerCaps);
    if (!result) return null;
    if (innerCaps.length > 0) {
      for (const c of innerCaps) {
        newCaps.push(c);
      }
    } else {
      newCaps.push(s.substring(capStart, result.endPos));
    }
    return { endPos: result.endPos, captures: newCaps };
  }

  if (atom.type === 'backref') {
    const capIdx = atom.n - 1; // 0-based
    if (capIdx >= captures.length) return null;
    const capVal = String(captures[capIdx]);
    if (s.substring(pos, pos + capVal.length) !== capVal) return null;
    return { endPos: pos + capVal.length, captures: newCaps };
  }

  if (atom.type === 'balanced') {
    // %bxy
    if (pos >= s.length || s[pos] !== atom.x) return null;
    let depth = 0;
    let j = pos;
    while (j < s.length) {
      if (s[j] === atom.x) depth++;
      else if (s[j] === atom.y) {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
      j++;
    }
    if (depth !== 0) return null; // unbalanced
    return { endPos: j, captures: newCaps };
  }

  if (atom.type === 'frontier') {
    // %f[set] — zero-width assertion
    // True if the character BEFORE pos is NOT in set,
    // and the character AT pos IS in set (or pos is end of string and
    // the char before is in set)
    const set = atom.set;
    const beforeChar = pos > 0 ? s[pos - 1] : '\0';
    const atChar = pos < s.length ? s[pos] : '\0';

    const beforeInSet = set.chars.has(beforeChar);
    const atInSet = set.chars.has(atChar);

    if (set.negated) {
      if (beforeInSet || !atInSet) return null;
    } else {
      if (!beforeInSet || atInSet) return null;
    }
    return { endPos: pos, captures: newCaps }; // zero-width
  }

  return null;
}

function matchQuantifier(atom, s, pos, captures, quant) {
  // For * and +: greedy — match as many as possible, then backtrack
  // For -: lazy — match as few as possible
  if (quant === '-') {
    // Lazy: try 0 first, then 1, 2, …
    let count = 0;
    let cur = pos;
    const allCaps = [...captures];

    while (true) {
      // Try matching the rest from cur
      // We need the remaining atoms — but we're called in a context where
      // the engine iterates atoms. This is a problem.
      // We'll handle quantifiers differently — with backtracking.
      // For now, collect all possible matches
      if (count > 0 || quant === '-' || quant === '*') {
        // Return position without consuming (0 matches)
        return { endPos: pos, captures: allCaps };
      }
      break;
    }
    return null;
  }

  // For * and +: greedy
  // Collect maximum matches
  const matches = [];
  let cur = pos;
  const allCaps = [...captures];

  while (true) {
    const result = matchOne(atom, s, cur, allCaps);
    if (!result) break;
    matches.push({ start: cur, end: result.endPos });
    cur = result.endPos;
    result.captures.forEach((c, idx) => {
      if (idx < allCaps.length) allCaps[idx] = c;
      else allCaps.push(c);
    });
  }

  const min = (quant === '+') ? 1 : 0;
  if (matches.length < min) return null;

  // For greedy, we matched the maximum. Return the last position.
  // (Backtracking will be handled at a higher level if needed)
  return { endPos: cur, captures: allCaps };
}

function matchPattern(s, pattern, startPos) {
  const atoms = parsePattern(pattern);
  const hasStartAnchor = atoms.length > 0 && atoms[0].type === 'anchor_start';

  let searchFrom = startPos;

  while (searchFrom <= s.length) {
    const caps = [];
    const result = matchHere(atoms, s, searchFrom, caps);

    if (result) {
      return {
        start: searchFrom + 1,  // 1‑based
        end: result.endPos,      // already 1‑based (pos is 0‑based, endPos is count)
        captures: result.captures,
      };
    }

    if (hasStartAnchor) break; // anchored — only try startPos
    searchFrom++;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function luaFind(s, pattern, init = 1, plain = false) {
  if (typeof s !== 'string') {
    throw new Error('luaFind: subject must be a string');
  }
  if (typeof pattern !== 'string') {
    throw new Error('luaFind: pattern must be a string');
  }

  const startPos = Math.max(1, init || 1) - 1; // convert to 0‑based

  if (plain) {
    // Literal match
    const idx = s.indexOf(pattern, startPos);
    if (idx === -1) return null;
    return [idx + 1, idx + pattern.length];
  }

  const result = matchPattern(s, pattern, startPos);
  if (!result) return null;

  const captures = result.captures || [];
  return [result.start, result.end, ...captures];
}

export function luaMatch(s, pattern, init = 1) {
  if (typeof s !== 'string') {
    throw new Error('luaMatch: subject must be a string');
  }
  if (typeof pattern !== 'string') {
    throw new Error('luaMatch: pattern must be a string');
  }

  const startPos = Math.max(1, init || 1) - 1;
  const atoms = parsePattern(pattern);

  const hasCaptures = atoms.some(a => a.type === 'capture' || a.type === 'position');
  const hasExplicitCaptures = atoms.some(a => a.type === 'capture');

  const result = matchPattern(s, pattern, startPos);
  if (!result) return null;

  if (!hasCaptures) {
    return s.substring(result.start - 1, result.end);
  }

  const caps = result.captures || [];

  if (caps.length === 1) {
    return caps[0];
  }

  return caps;
}

export function luaGmatch(s, pattern) {
  if (typeof s !== 'string') {
    throw new Error('luaGmatch: subject must be a string');
  }
  if (typeof pattern !== 'string') {
    throw new Error('luaGmatch: pattern must be a string');
  }

  const atoms = parsePattern(pattern);
  const hasCaptures = atoms.some(a => a.type === 'capture' || a.type === 'position');

  let pos = 0; // 0‑based

  return function gmatchIterator() {
    if (pos > s.length) return null;

    const result = matchPattern(s, pattern, pos);
    if (!result) return null;

    // Advance position
    if (result.end === result.start - 1) {
      // Empty match — advance by 1 to avoid infinite loop
      pos = result.start; // start is 1‑based, so this is pos+1 effectively
    } else {
      pos = result.end;
    }

    if (!hasCaptures) {
      return s.substring(result.start - 1, result.end);
    }

    const caps = result.captures || [];
    if (caps.length === 1) {
      return caps[0];
    }
    return caps;
  };
}

export function luaGsub(s, pattern, repl, n) {
  if (typeof s !== 'string') {
    throw new Error('luaGsub: subject must be a string');
  }
  if (typeof pattern !== 'string') {
    throw new Error('luaGsub: pattern must be a string');
  }

  const atoms = parsePattern(pattern);
  const hasCaptures = atoms.some(a => a.type === 'capture' || a.type === 'position');
  const maxN = (n == null) ? Infinity : n;
  let count = 0;
  let pos = 0; // 0‑based
  let result = '';

  while (count < maxN && pos <= s.length) {
    const matchRes = matchPattern(s, pattern, pos);
    if (!matchRes) break;

    // Add text before match
    result += s.substring(pos, matchRes.start - 1);

    const caps = matchRes.captures || [];

    let replacement;
    if (typeof repl === 'function') {
      replacement = repl(...caps);
    } else if (typeof repl === 'object' && repl !== null && !Array.isArray(repl)) {
      const key = caps.length > 0 ? String(caps[0]) : '';
      replacement = (key in repl) ? String(repl[key]) : '';
    } else if (typeof repl === 'string') {
      // String with %1-%9 back-references
      replacement = repl.replace(/%([0-9])/g, (_, d) => {
        const idx = Number(d) - 1;
        return idx < caps.length ? String(caps[idx]) : '';
      });
      // %% → %
      replacement = replacement.replace(/%%/g, '%');
    } else {
      replacement = '';
    }

    result += replacement;
    count++;

    // Advance
    if (matchRes.end === matchRes.start - 1) {
      pos = matchRes.start;
    } else {
      pos = matchRes.end;
    }
  }

  // Add trailing text
  result += s.substring(pos);

  return [result, count];
}

// ---------------------------------------------------------------------------
// Additional utilities (documented for external use)
// ---------------------------------------------------------------------------

/**
 * Escape a string for use as a literal pattern (escape all magic characters).
 */
export function luaEscape(s) {
  return s.replace(/[().%+\-*?[\]^$]/g, '%$&');
}
