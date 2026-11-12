/* Lua 5.4.8 parser migration, AST stage. Reference lparser.c; lobject.js notice.
 * No Lua bytecode is emitted yet. Unsupported goto/labels fail loudly; <close> locals have runtime cleanup.
 */
import { LexState } from './llex.js';
import { LuaError } from './lobject.js';
import { freeNames } from './lcode-roots.js';
const precedence = new Map([
  ['or', [1, 1]], ['and', [2, 2]], ['<', [3, 3]], ['>', [3, 3]], ['<=', [3, 3]], ['>=', [3, 3]], ['~=', [3, 3]], ['==', [3, 3]],
  ['|', [4, 4]], ['~', [5, 5]], ['&', [6, 6]], ['<<', [7, 7]], ['>>', [7, 7]], ['..', [9, 8]],
  ['+', [10, 10]], ['-', [10, 10]], ['*', [11, 11]], ['/', [11, 11]], ['//', [11, 11]], ['%', [11, 11]], ['^', [14, 13]],
]);
export class Parser {
  constructor(source, name = 'chunk') { this.name = name; this.tokens = new LexState(source, name).scan(); this.at = 0; this.loopDepth = 0; this.vararg = true; }
  get token() { return this.tokens[this.at]; }
  is(type) { return this.token.type === type; }
  take(type) { if (this.is(type)) return this.tokens[this.at++]; return null; }
  error(message) { throw new LuaError(`${this.name}:${this.token.line}: ${message} near '${this.token.type}'`); }
  need(type) { const token = this.take(type); if (!token) this.error(`'${type}' expected`); return token; }
  nameToken() { return this.need('name').value; }
  block(terminators = ['end', 'else', 'elseif', 'until', 'eof']) {
    const body = [];
    while (!terminators.includes(this.token.type)) {
      const statement = this.statement(); if (statement) body.push(statement);
      if (statement?.kind === 'return') { this.take(';'); if (!terminators.includes(this.token.type)) this.error('return must end a block'); break; }
    }
    return body;
  }
  parse() { const body = this.block(['eof']); this.need('eof'); const result = { kind: 'function', params: [], vararg: true, body, name: this.name, source: this.name, linedefined: 0, lastlinedefined: 0, what: 'main' }; result.freeNames = freeNames(result); return result; }
  expressionList() { const list = [this.expression()]; while (this.take(',')) list.push(this.expression()); return list; }
  functionBody(method = false, linedefined = this.token.line) {
    this.need('('); const params = method ? ['self'] : []; let vararg = false;
    if (!this.is(')')) {
      do {
        if (this.take('...')) { vararg = true; break; }
        params.push(this.nameToken());
      } while (this.take(','));
    }
    this.need(')');
    const previous = [this.loopDepth, this.vararg]; this.loopDepth = 0; this.vararg = vararg;
    const body = this.block(); const end = this.need('end');
    [this.loopDepth, this.vararg] = previous;
    const result = { kind: 'function', params, vararg, body, name: this.name, source: this.name, linedefined, lastlinedefined: end.line, what: 'Lua' };
    result.freeNames = freeNames(result); return result;
  }
  statement() {
    const line = this.token.line;
    if (this.take(';')) return null;
    if (this.take('return')) {
      const values = ['eof', 'end', 'else', 'elseif', 'until', ';'].includes(this.token.type) ? [] : this.expressionList();
      return { kind: 'return', values, line };
    }
    if (this.take('break')) { if (!this.loopDepth) this.error('break outside loop'); return { kind: 'break', line }; }
    if (this.is('goto') || this.is('::')) this.error('goto/labels are not implemented in this migration stage');
    if (this.take('do')) { const body = this.block(); this.need('end'); return { kind: 'do', body, line }; }
    if (this.take('if')) {
      const branches = [];
      do { const test = this.expression(); this.need('then'); branches.push({ test, body: this.block() }); } while (this.take('elseif'));
      const otherwise = this.take('else') ? this.block() : [];
      this.need('end'); return { kind: 'if', branches, otherwise, line };
    }
    if (this.take('while')) {
      const test = this.expression(); this.need('do'); this.loopDepth++;
      const body = this.block(); this.loopDepth--; this.need('end'); return { kind: 'while', test, body, line };
    }
    if (this.take('repeat')) {
      this.loopDepth++; const body = this.block(); this.loopDepth--; this.need('until');
      return { kind: 'repeat', body, test: this.expression(), line };
    }
    if (this.take('for')) {
      const first = this.nameToken();
      if (this.take('=')) {
        const start = this.expression(); this.need(','); const stop = this.expression();
        const step = this.take(',') ? this.expression() : { kind: 'literal', value: 1n };
        this.need('do'); this.loopDepth++; const body = this.block(); this.loopDepth--; this.need('end');
        return { kind: 'for', variable: first, start, stop, step, body, line };
      }
      const names = [first]; while (this.take(',')) names.push(this.nameToken());
      this.need('in'); const values = this.expressionList(); this.need('do');
      this.loopDepth++; const body = this.block(); this.loopDepth--; this.need('end');
      return { kind: 'forin', names, values, body, line };
    }
    if (this.take('function')) {
      let target = { kind: 'variable', name: this.nameToken() };
      while (this.take('.')) target = { kind: 'index', table: target, key: { kind: 'literal', value: this.nameToken() } };
      let method = false;
      if (this.take(':')) { method = true; target = { kind: 'index', table: target, key: { kind: 'literal', value: this.nameToken() } }; }
      return { kind: 'assign', targets: [target], values: [this.functionBody(method, line)], line };
    }
    if (this.take('local')) {
      if (this.take('function')) { const name = this.nameToken(); return { kind: 'localfunction', name, value: this.functionBody(false, line), line }; }
      const names = [];
      do {
        const name = this.nameToken(); let attribute = null;
        if (this.take('<')) { attribute = this.nameToken(); this.need('>'); if (attribute !== 'const' && attribute !== 'close') this.error('unknown local attribute'); if (attribute === 'close' && names.some(item => item.attribute === 'close')) this.error('multiple to-be-closed variables in local list'); }
        names.push({ name, attribute });
      } while (this.take(','));
      return { kind: 'local', names, values: this.take('=') ? this.expressionList() : [], line };
    }
    const first = this.suffixed();
    if (first.kind === 'call' && !this.is(',') && !this.is('=')) return { kind: 'callstatement', value: first, line };
    const targets = [first]; while (this.take(',')) targets.push(this.suffixed());
    if (targets.some(target => !['variable', 'index'].includes(target.kind))) this.error('assignment target expected');
    this.need('='); return { kind: 'assign', targets, values: this.expressionList(), line };
  }
  expression(limit = 0) {
    let left;
    if (['not', '-', '~', '#'].includes(this.token.type)) {
      const op = this.tokens[this.at++].type;
      left = { kind: 'unary', op, value: this.expression(12) };
    } else left = this.simple();
    while (precedence.has(this.token.type) && precedence.get(this.token.type)[0] > limit) {
      const op = this.tokens[this.at++].type;
      left = { kind: 'binary', op, left, right: this.expression(precedence.get(op)[1]) };
    }
    return left;
  }
  simple() {
    if (this.is('number') || this.is('string')) return { kind: 'literal', value: this.tokens[this.at++].value };
    if (this.take('nil')) return { kind: 'literal', value: null };
    if (this.take('true')) return { kind: 'literal', value: true };
    if (this.take('false')) return { kind: 'literal', value: false };
    if (this.take('...')) { if (!this.vararg) this.error('cannot use ... outside a vararg function'); return { kind: 'vararg' }; }
    const functionToken = this.take('function'); if (functionToken) return this.functionBody(false, functionToken.line);
    if (this.is('{')) return this.constructorExpression();
    return this.suffixed();
  }
  suffixed() {
    let node;
    if (this.is('name')) node = { kind: 'variable', name: this.nameToken() };
    else if (this.take('(')) { node = { kind: 'paren', value: this.expression() }; this.need(')'); }
    else this.error('expression expected');
    while (true) {
      if (this.take('.')) node = { kind: 'index', table: node, key: { kind: 'literal', value: this.nameToken() } };
      else if (this.take('[')) { const key = this.expression(); this.need(']'); node = { kind: 'index', table: node, key }; }
      else if (this.take(':')) { const method = this.nameToken(); node = { kind: 'call', callee: node, method, args: this.arguments() }; }
      else if (this.is('(') || this.is('{') || this.is('string')) node = { kind: 'call', callee: node, method: null, args: this.arguments() };
      else break;
    }
    return node;
  }
  arguments() {
    if (this.take('(')) { const values = this.is(')') ? [] : this.expressionList(); this.need(')'); return values; }
    if (this.is('{')) return [this.constructorExpression()];
    return [{ kind: 'literal', value: this.need('string').value }];
  }
  constructorExpression() {
    this.need('{'); const fields = [];
    while (!this.is('}')) {
      let key = null, value;
      if (this.take('[')) { key = this.expression(); this.need(']'); this.need('='); value = this.expression(); }
      else if (this.is('name') && this.tokens[this.at + 1].type === '=') {
        key = { kind: 'literal', value: this.nameToken() }; this.need('='); value = this.expression();
      } else value = this.expression();
      fields.push({ key, value });
      if (!this.take(',') && !this.take(';')) break;
    }
    this.need('}'); return { kind: 'table', fields };
  }
}
export const parse = (source, name) => new Parser(source, name).parse();
