// Lua 5.4 recursive-descent parser — token stream → AST.
// Exports: parse(tokens, filename?) -> AST (Chunk node)
//          LuaParseError — thrown on syntax errors with line info.
//
// AST node types emitted:
// ---------------------------------------------------------------------------
// Chunk              { type: 'Chunk', body: [Stat...], line }
//   top-level container.
//
// -- Statements -------------------------------------------------------------
// LocalDeclaration   { type: 'LocalDeclaration', names: [string], values:
//                      [Exp|null], line }
//   `local a, b = 1, 2` — values list may be shorter than names.
// Assignment         { type: 'Assignment', vars: [Var], values: [Exp], line }
//   `a, b.c = 1, 2`.  Var = Variable | IndexExpression | MemberExpression.
// FunctionDeclaration{ type: 'FunctionDeclaration', name: Var, params:
//                      [string], body: [Stat], line }
//   `function f(a,b) ... end`  or  `function tbl.fn(a,b) ... end`.
// IfStatement        { type: 'IfStatement', clauses: [{ condition: Exp,
//                      body: [Stat] }], elseBody: [Stat]|null, line }
//   `if ... then ... elseif ... then ... else ... end`.
// NumericFor         { type: 'NumericFor', var: string, start: Exp,
//                      end: Exp, step: Exp|null, body: [Stat], line }
//   `for i = 1, 10, 2 do ... end`.  step is null when omitted.
// GenericFor         { type: 'GenericFor', vars: [string], iterators:
//                      [Exp], body: [Stat], line }
//   `for k, v in pairs(t) do ... end`.
// WhileStatement     { type: 'WhileStatement', condition: Exp, body:
//                      [Stat], line }
//   `while x do ... end`.
// RepeatStatement    { type: 'RepeatStatement', body: [Stat], condition:
//                      Exp, line }
//   `repeat ... until cond`.
// CallStatement      { type: 'CallStatement', call: FunctionCall |
//                      MethodCall, line }
//   `f()` as a statement.
// ReturnStatement    { type: 'ReturnStatement', values: [Exp], line }
//   `return a, b`.
// BreakStatement     { type: 'BreakStatement', line }
//   `break`.
// DoBlock            { type: 'DoBlock', body: [Stat], line }
//   `do ... end`.
//
// -- Expressions ------------------------------------------------------------
// Literal            { type: 'Literal', value: boolean|number|string|null,
//                      line }
//   nil, false, true, numbers, strings.
// VarArgs            { type: 'VarArgs', line }
//   `...` — variable arguments.
// Variable           { type: 'Variable', name: string, line }
//   bare identifier.
// IndexExpression    { type: 'IndexExpression', base: Exp, index: Exp,
//                      line }
//   `base[exp]`.
// MemberExpression   { type: 'MemberExpression', base: Exp, member:
//                      string, line }
//   `base.name`.
// FunctionExpression { type: 'FunctionExpression', params: [string],
//                      body: [Stat], line }
//   `function(a,b) ... end`.
// TableConstructor   { type: 'TableConstructor', fields: [TableField],
//                      line }
//   `{ 1, 2, [k]=v, name=v }`.
// TableField         { type: 'TableField', key: Exp|null, value: Exp,
//                      line }
//   key is null for array-style fields.
//   For `name = v` sugar the key is a Literal of the name string.
// BinaryExpression   { type: 'BinaryExpression', operator: string,
//                      left: Exp, right: Exp, line }
// UnaryExpression    { type: 'UnaryExpression', operator: string,
//                      argument: Exp, line }
//   `not a`, `-x`, `#t`, `~n`.
// FunctionCall       { type: 'FunctionCall', base: Exp, args: [Exp],
//                      line }
//   `f(a,b)`, `f{table}`, `f"str"`.
// MethodCall         { type: 'MethodCall', base: Exp, method: string,
//                      args: [Exp], line }
//   `obj:method(args)` — interpreter must desugar to
//   `obj.method(obj, args)` (implicit self).
// ---------------------------------------------------------------------------

const UNARY_OPS = new Set(['not', '-', '#', '~']);

// Binary-operator precedence table (higher number = tighter binding).
// Lua 5.4 operator precedence (low→high):
//   or, and, < > <= >= ~= ==, |, ~, &, << >>, .., + -, * / // %, unary, ^
const BINOP_PREC = {
  'or':  1,
  'and': 2,
  '<':   3, '>': 3, '<=': 3, '>=': 3, '~=': 3, '==': 3,
  '|':   4,
  '~':   5,
  '&':   6,
  '<<':  7, '>>': 7,
  '..':  8,
  '+':   9, '-': 9,
  '*':  10, '/': 10, '//': 10, '%': 10,
  '^':  12,
};

// Right-associative operators.
const RIGHT_ASSOC = new Set(['^', '..']);

export class LuaParseError extends Error {
  constructor(message, line, filename) {
    const where = filename ? `${filename}:` : '';
    super(`${where}${line}: ${message}`);
    this.name = 'LuaParseError';
    this.line = line;
    this.filename = filename;
  }
}

export function parse(tokens, filename) {
  const p = new Parser(tokens, filename);
  return p.parseChunk();
}

class Parser {
  constructor(tokens, filename) {
    this.tokens = tokens;
    this.filename = filename;
    this.pos = 0;
  }

  // ---- helpers ----

  cur() {
    return this.tokens[this.pos];
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset];
  }

  line() {
    const t = this.cur();
    return t ? t.line : 0;
  }

  at(type, value) {
    const t = this.cur();
    if (!t) return false;
    if (value !== undefined) return t.type === type && t.value === value;
    return t.type === type;
  }

  atKwd(value)   { return this.at('keyword', value); }
  atPunc(value)  { return this.at('punctuation', value); }

  consumedLine() {
    // return the line of the token *before* the current position
    if (this.pos > 0) {
      const t = this.tokens[this.pos - 1];
      if (t) return t.line;
    }
    return this.cur() ? this.cur().line : 0;
  }

  advance() {
    const t = this.tokens[this.pos];
    if (t && t.type !== 'eof') this.pos++;
    return t;
  }

  expect(type, value) {
    const t = this.cur();
    if (!t || t.type !== type || (value !== undefined && t.value !== value)) {
      const expected = value !== undefined ? `${type} '${value}'` : type;
      const found = t
        ? `${t.type}${t.value !== null ? ' ' + JSON.stringify(t.value) : ''}`
        : 'EOF';
      this.fail(`expected ${expected} but got ${found}`);
    }
    return this.advance();
  }

  fail(msg) {
    throw new LuaParseError(msg, this.line(), this.filename);
  }

  // ---- entry ----

  parseChunk() {
    const body = this.parseBlock();
    // expect eof
    if (!this.at('eof')) {
      this.fail(`unexpected token after end of chunk`);
    }
    return { type: 'Chunk', body, line: body.length > 0 ? body[0].line : 0 };
  }

  // block → stat* (stops at eof/end/else/elseif/until)
  parseBlock(stopTokens) {
    const stop = stopTokens
      ? new Set(stopTokens)
      : new Set(['eof']);
    // Also stop on these keywords
    const stopKwds = new Set(['end', 'else', 'elseif', 'until']);
    const body = [];
    while (true) {
      const t = this.cur();
      if (!t || t.type === 'eof') break;
      if (t.type === 'keyword' && stopKwds.has(t.value)) break;
      if (stop && stop.has(t.value)) break;
      const stmt = this.parseStat();
      if (stmt) body.push(stmt);
      // Optional semicolons between statements
      while (this.atPunc(';')) this.advance();
    }
    return body;
  }

  // ---- statements ----

  parseStat() {
    const t = this.cur();
    if (!t) return null;

    if (t.type === 'keyword') {
      switch (t.value) {
        case 'local':    return this.parseLocalDecl();
        case 'function': return this.parseFunctionDecl();
        case 'if':       return this.parseIf();
        case 'for':      return this.parseFor();
        case 'while':    return this.parseWhile();
        case 'repeat':   return this.parseRepeat();
        case 'return':   return this.parseReturn();
        case 'break':    return this.parseBreak();
        case 'do':       return this.parseDoBlock();
        default:
          // fall through to expression-statement handling
          break;
      }
    }

    // expression statement: assignment or call
    return this.parseExpStatement();
  }

  parseExpStatement() {
    // This could be an assignment or a standalone call.
    // We parse a prefix expression chain; if followed by `=` or `,=` it's
    // an assignment, otherwise it's a call statement.
    const firstExp = this.parseSubExp(0);
    const l = firstExp.line;

    if (this.atPunc('=') || this.atPunc(',')) {
      // It's an assignment
      const vars = [firstExp];
      while (this.atPunc(',')) {
        this.advance();
        vars.push(this.parseSubExp(0));
      }
      this.expect('punctuation', '=');
      const values = this.parseExpList();
      return { type: 'Assignment', vars, values, line: l };
    }

    // Must be a call statement
    if (firstExp.type === 'FunctionCall' || firstExp.type === 'MethodCall') {
      return { type: 'CallStatement', call: firstExp, line: l };
    }
    this.fail(`unexpected expression as statement`);
    return null; // unreachable
  }

  parseLocalDecl() {
    const l = this.line();
    this.advance(); // 'local'

    if (this.atKwd('function')) {
      // local function name(...) body end
      this.advance(); // 'function'
      const name = this.expect('identifier').value;
      const params = this.parseFuncParams();
      const body = this.parseBlock();
      this.expect('keyword', 'end');
      return { type: 'FunctionDeclaration', name: { type: 'Variable', name, line: l },
               params, body, line: l };
    }

    const names = [this.expect('identifier').value];
    while (this.atPunc(',')) {
      this.advance();
      names.push(this.expect('identifier').value);
    }

    let values = [];
    if (this.atPunc('=')) {
      this.advance();
      values = this.parseExpList();
    }

    // pad values with nulls
    const vals = [];
    for (let i = 0; i < names.length; i++) {
      vals.push(i < values.length ? values[i] : null);
    }

    return { type: 'LocalDeclaration', names, values: vals, line: l };
  }

  parseFunctionDecl() {
    const l = this.line();
    this.advance(); // 'function'

    // function name may be Name, Name.Name..., Name:Name
    const nameParts = [this.expect('identifier').value];
    while (this.atPunc('.')) {
      this.advance();
      nameParts.push(this.expect('identifier').value);
    }

    let isMethod = false;
    if (this.atPunc(':')) {
      isMethod = true;
      this.advance();
      nameParts.push(this.expect('identifier').value);
    }

    const params = this.parseFuncParams();
    const body = this.parseBlock();
    this.expect('keyword', 'end');

    // Build the variable reference for the function name
    let nameVar;
    if (nameParts.length === 1 && !isMethod) {
      nameVar = { type: 'Variable', name: nameParts[0], line: l };
    } else if (isMethod) {
      // v.fn:method — the method is the last part, 
      // build base as v.fn, then member = method
      const last = nameParts.pop();
      let baseVar = { type: 'Variable', name: nameParts[0], line: l };
      for (let i = 1; i < nameParts.length; i++) {
        baseVar = { type: 'MemberExpression', base: baseVar, member: nameParts[i], line: l };
      }
      nameVar = { type: 'MemberExpression', base: baseVar, member: last, line: l };
    } else {
      const last = nameParts.pop();
      let baseVar = { type: 'Variable', name: nameParts[0], line: l };
      for (let i = 1; i < nameParts.length; i++) {
        baseVar = { type: 'MemberExpression', base: baseVar, member: nameParts[i], line: l };
      }
      nameVar = { type: 'MemberExpression', base: baseVar, member: last, line: l };
    }

    return { type: 'FunctionDeclaration', name: nameVar, params, body, line: l };
  }

  parseFuncParams() {
    const params = [];
    this.expect('punctuation', '(');
    if (this.atPunc(')')) {
      this.advance();
      return params;
    }
    if (this.atPunc('...')) {
      this.advance();
      params.push('...');
      this.expect('punctuation', ')');
      return params;
    }
    params.push(this.expect('identifier').value);
    while (this.atPunc(',')) {
      this.advance();
      if (this.atPunc('...')) {
        this.advance();
        params.push('...');
        break;
      }
      params.push(this.expect('identifier').value);
    }
    this.expect('punctuation', ')');
    return params;
  }

  parseIf() {
    const l = this.line();
    this.advance(); // 'if'
    const clauses = [];
    const cond = this.parseExp();
    this.expect('keyword', 'then');
    const body = this.parseBlock();
    clauses.push({ condition: cond, body });

    let elseBody = null;
    while (this.atKwd('elseif')) {
      this.advance();
      const econd = this.parseExp();
      this.expect('keyword', 'then');
      const ebody = this.parseBlock();
      clauses.push({ condition: econd, body: ebody });
    }
    if (this.atKwd('else')) {
      this.advance();
      elseBody = this.parseBlock();
    }
    this.expect('keyword', 'end');
    return { type: 'IfStatement', clauses, elseBody, line: l };
  }

  parseFor() {
    const l = this.line();
    this.advance(); // 'for'

    // Peek ahead: if we see `name = exp, exp` it's numeric for;
    // if we see `namelist in` it's generic for.
    // We need to detect: `for Name ...` where after the first name comes
    // `=` (numeric) or `,` or `in` (generic).

    const firstName = this.expect('identifier').value;

    if (this.atPunc('=')) {
      // numeric for: for i = start, end [, step] do ... end
      this.advance(); // '='
      const start = this.parseExp();
      this.expect('punctuation', ',');
      const end = this.parseExp();
      let step = null;
      if (this.atPunc(',')) {
        this.advance();
        step = this.parseExp();
      }
      this.expect('keyword', 'do');
      const body = this.parseBlock();
      this.expect('keyword', 'end');
      return { type: 'NumericFor', var: firstName, start, end, step, body, line: l };
    }

    // generic for: for var [, var...] in explist do ... end
    const vars = [firstName];
    while (this.atPunc(',')) {
      this.advance();
      vars.push(this.expect('identifier').value);
    }
    this.expect('keyword', 'in');
    const iterators = this.parseExpList();
    this.expect('keyword', 'do');
    const body = this.parseBlock();
    this.expect('keyword', 'end');
    return { type: 'GenericFor', vars, iterators, body, line: l };
  }

  parseWhile() {
    const l = this.line();
    this.advance(); // 'while'
    const condition = this.parseExp();
    this.expect('keyword', 'do');
    const body = this.parseBlock();
    this.expect('keyword', 'end');
    return { type: 'WhileStatement', condition, body, line: l };
  }

  parseRepeat() {
    const l = this.line();
    this.advance(); // 'repeat'
    const body = this.parseBlock();
    this.expect('keyword', 'until');
    const condition = this.parseExp();
    return { type: 'RepeatStatement', body, condition, line: l };
  }

  parseReturn() {
    const l = this.line();
    this.advance(); // 'return'
    const values = [];
    if (!this.atKwd('end') && !this.atKwd('else') &&
        !this.atKwd('elseif') && !this.atKwd('until') &&
        !this.at('eof') && !this.atPunc(';')) {
      values.push(...this.parseExpList());
    }
    // optional semicolon after return
    while (this.atPunc(';')) this.advance();
    return { type: 'ReturnStatement', values, line: l };
  }

  parseBreak() {
    const l = this.line();
    this.advance(); // 'break'
    return { type: 'BreakStatement', line: l };
  }

  parseDoBlock() {
    const l = this.line();
    this.advance(); // 'do'
    const body = this.parseBlock();
    this.expect('keyword', 'end');
    return { type: 'DoBlock', body, line: l };
  }

  // ---- expressions ----

  parseExp() {
    return this.parseSubExp(0);
  }

  parseSubExp(minPrec) {
    let left = this.parsePrefixExp();

    while (true) {
      const t = this.cur();
      if (!t || t.type === 'eof') break;

      // Check for binary operator
      if (t.type === 'keyword' && (t.value === 'and' || t.value === 'or')) {
        const prec = BINOP_PREC[t.value] || 0;
        if (prec <= minPrec) break;
        const op = t.value;
        this.advance();
        const nextMin = RIGHT_ASSOC.has(op) ? prec - 1 : prec;  /* precedence climbing:
           the loop breaks on `prec <= minPrec`, so a LEFT-associative operator must
           recurse at `prec` (an equal-precedence operator then breaks, a tighter one
           binds) and a RIGHT-associative one at `prec - 1` (the same operator binds
           again).  This read `prec` / `prec + 1`, one step too high on both arms, so
           EVERY mixed-precedence expression in every dat/*.lua parsed left-to-right:
           `12 + 2*9` evaluated as `(12+2)*9` = 126, `1 + 2 - 3*4` as `((1+2)-3)*4` = 0,
           and `2^3^2` as `(2^3)^2` = 64.  Witness: bigrm-13.lua:61
           `des.map({ coord = {12 + x*9, 4 + y*5}, ... })` produced coord <108,20>
           — (12+0)*9 and (4+0)*5 — instead of <12,4>. */
        const right = this.parseSubExp(nextMin);
        left = { type: 'BinaryExpression', operator: op, left, right, line: left.line };
        continue;
      }

      if (t.type === 'punctuation') {
        const prec = BINOP_PREC[t.value];
        if (prec !== undefined) {
          if (prec <= minPrec) break;
          const op = t.value;
          this.advance();
          const nextMin = RIGHT_ASSOC.has(op) ? prec - 1 : prec;  /* precedence climbing:
           the loop breaks on `prec <= minPrec`, so a LEFT-associative operator must
           recurse at `prec` (an equal-precedence operator then breaks, a tighter one
           binds) and a RIGHT-associative one at `prec - 1` (the same operator binds
           again).  This read `prec` / `prec + 1`, one step too high on both arms, so
           EVERY mixed-precedence expression in every dat/*.lua parsed left-to-right:
           `12 + 2*9` evaluated as `(12+2)*9` = 126, `1 + 2 - 3*4` as `((1+2)-3)*4` = 0,
           and `2^3^2` as `(2^3)^2` = 64.  Witness: bigrm-13.lua:61
           `des.map({ coord = {12 + x*9, 4 + y*5}, ... })` produced coord <108,20>
           — (12+0)*9 and (4+0)*5 — instead of <12,4>. */
          const right = this.parseSubExp(nextMin);
          left = { type: 'BinaryExpression', operator: op, left, right, line: left.line };
          continue;
        }

        // Check for suffix operators: [ . : ( { string
        if (t.value === '[' || t.value === '.' || t.value === ':' ||
            t.value === '(') {
          // These are handled inside parsePrefixExp's loop, so they shouldn't
          // be reached here — but if parsePrefixExp returns something that
          // still has suffix tokens pending, handle them.
          // Actually, parsePrefixExp already consumes all suffixes.
          break;
        }
      }

      // Check for string or table constructor as function argument (no-parens call)
      if (t.type === 'string' || (t.type === 'punctuation' && t.value === '{')) {
        // This is a suffix call, but parsePrefixExp should have consumed it.
        break;
      }

      break;
    }

    return left;
  }

  parsePrefixExp() {
    const t = this.cur();
    if (!t) this.fail('unexpected end of input');

    let left;
    const l = t.line;

    if (t.type === 'keyword' && (t.value === 'nil' || t.value === 'true' || t.value === 'false')) {
      this.advance();
      const literalValue = t.value === 'nil' ? null :
                           t.value === 'true' ? true : false;
      left = { type: 'Literal', value: literalValue, line: l };
    } else if (t.type === 'number') {
      this.advance();
      const num = parseFloat(t.value);
      left = { type: 'Literal', value: Number.isNaN(num) ? 0 : num, line: l };
    } else if (t.type === 'string') {
      this.advance();
      left = { type: 'Literal', value: t.value, line: l };
    } else if (t.type === 'punctuation' && t.value === '...') {
      this.advance();
      left = { type: 'VarArgs', line: l };
    } else if (t.type === 'punctuation' && t.value === '{') {
      left = this.parseTableConstructor();
    } else if (t.type === 'keyword' && t.value === 'function') {
      left = this.parseFunctionExpression();
    } else if (t.type === 'punctuation' && t.value === '(') {
      this.advance();
      left = this.parseExp();
      this.expect('punctuation', ')');
    } else if (t.type === 'identifier') {
      this.advance();
      left = { type: 'Variable', name: t.value, line: l };
    } else if (t.type === 'keyword' && UNARY_OPS.has(t.value)) {
      // Unary operator: not, - (# is punctuation, ~ is punctuation)
      this.advance();
      const arg = this.parseSubExp(11); // unary prec = 11
      left = { type: 'UnaryExpression', operator: t.value, argument: arg, line: l };
    } else if (t.type === 'punctuation' && UNARY_OPS.has(t.value)) {
      this.advance();
      const arg = this.parseSubExp(11);
      left = { type: 'UnaryExpression', operator: t.value, argument: arg, line: l };
    } else {
      this.fail(`unexpected token ${t.type} '${t.value}' in expression`);
    }

    // Suffix chain: [exp], .name, :name(args), (args), {table}, "string"
    while (true) {
      const c = this.cur();
      if (!c || c.type === 'eof') break;

      if (c.type === 'punctuation') {
        if (c.value === '[') {
          this.advance();
          const idx = this.parseExp();
          this.expect('punctuation', ']');
          left = { type: 'IndexExpression', base: left, index: idx, line: left.line };
          continue;
        }
        if (c.value === '.') {
          this.advance();
          const member = this.expect('identifier').value;
          left = { type: 'MemberExpression', base: left, member, line: left.line };
          continue;
        }
        if (c.value === ':') {
          this.advance();
          const method = this.expect('identifier').value;
          const args = this.parseArgs();
          left = { type: 'MethodCall', base: left, method, args, line: left.line };
          continue;
        }
        if (c.value === '(') {
          const args = this.parseArgs();
          left = { type: 'FunctionCall', base: left, args, line: left.line };
          continue;
        }
        if (c.value === '{') {
          // table constructor as sole argument: f{table}
          const tbl = this.parseTableConstructor();
          left = { type: 'FunctionCall', base: left, args: [tbl], line: left.line };
          continue;
        }
      }

      if (c.type === 'string') {
        // string as sole argument: f"str" or f'str'
        this.advance();
        left = { type: 'FunctionCall', base: left,
                 args: [{ type: 'Literal', value: c.value, line: c.line }],
                 line: left.line };
        continue;
      }

      break;
    }

    return left;
  }

  parseArgs() {
    this.expect('punctuation', '(');
    if (this.atPunc(')')) {
      this.advance();
      return [];
    }
    const args = this.parseExpList();
    this.expect('punctuation', ')');
    return args;
  }

  parseExpList() {
    const exps = [this.parseExp()];
    while (this.atPunc(',')) {
      this.advance();
      exps.push(this.parseExp());
    }
    return exps;
  }

  parseTableConstructor() {
    const l = this.line();
    this.expect('punctuation', '{');
    const fields = [];

    if (this.atPunc('}')) {
      this.advance();
      return { type: 'TableConstructor', fields, line: l };
    }

    while (true) {
      const t = this.cur();
      if (!t) this.fail('unterminated table constructor');

      // Check for [key] = value
      if (t.type === 'punctuation' && t.value === '[') {
        this.advance();
        const key = this.parseExp();
        this.expect('punctuation', ']');
        this.expect('punctuation', '=');
        const value = this.parseExp();
        fields.push({ type: 'TableField', key, value, line: key.line });
      }
      // Check for name = value (sugar for ["name"] = value)
      else if (t.type === 'identifier') {
        // Peek: if followed by '=', it's name=value; otherwise it's an expression
        const next = this.peek(1);
        if (next && next.type === 'punctuation' && next.value === '=') {
          const name = t.value;
          this.advance(); // identifier
          this.advance(); // '='
          const value = this.parseExp();
          fields.push({
            type: 'TableField',
            key: { type: 'Literal', value: name, line: t.line },
            value,
            line: t.line,
          });
        } else {
          // Array-style field: just an expression
          const value = this.parseExp();
          fields.push({ type: 'TableField', key: null, value, line: value.line });
        }
      } else {
        // Array-style field
        const value = this.parseExp();
        fields.push({ type: 'TableField', key: null, value, line: value.line });
      }

      // Optional field separator: , or ;
      if (this.atPunc(',') || this.atPunc(';')) {
        this.advance();
        // Trailing separator before } is fine
        if (this.atPunc('}')) {
          this.advance();
          break;
        }
        continue;
      }

      // End of table
      if (this.atPunc('}')) {
        this.advance();
        break;
      }

      // If no separator and not '}', error
      this.fail(`expected ',' or '}' in table constructor`);
    }

    return { type: 'TableConstructor', fields, line: l };
  }

  parseFunctionExpression() {
    const l = this.line();
    this.advance(); // 'function'
    const params = this.parseFuncParams();
    const body = this.parseBlock();
    this.expect('keyword', 'end');
    return { type: 'FunctionExpression', params, body, line: l };
  }
}
