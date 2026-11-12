/* Lexical free-variable analysis for precise GC upvalue roots, not bytecode. */
export function freeNames(prototype) {
  const free = new Set(), scopes = [new Set(prototype.params)];
  const bound = name => scopes.some(scope => scope.has(name));
  const use = name => { if (!bound(name)) free.add(name); };
  const expression = node => {
    if (!node) return;
    if (node.kind === 'variable') use(node.name);
    else if (node.kind === 'function') for (const name of node.freeNames) use(name);
    else if (node.kind === 'unary' || node.kind === 'paren') expression(node.value);
    else if (node.kind === 'binary') { expression(node.left); expression(node.right); }
    else if (node.kind === 'index') { expression(node.table); expression(node.key); }
    else if (node.kind === 'call') { expression(node.callee); node.args.forEach(expression); }
    else if (node.kind === 'table') for (const field of node.fields) { expression(field.key); expression(field.value); }
  };
  const nested = (body, names = [], after = null) => { scopes.push(new Set(names)); statements(body); if (after) expression(after); scopes.pop(); };
  const statements = body => {
    for (const node of body) {
      if (node.kind === 'local') { node.values.forEach(expression); for (const item of node.names) scopes.at(-1).add(item.name); }
      else if (node.kind === 'localfunction') { scopes.at(-1).add(node.name); expression(node.value); }
      else if (node.kind === 'assign') { node.targets.forEach(expression); node.values.forEach(expression); }
      else if (node.kind === 'callstatement') expression(node.value);
      else if (node.kind === 'return') node.values.forEach(expression);
      else if (node.kind === 'do') nested(node.body);
      else if (node.kind === 'if') { for (const branch of node.branches) { expression(branch.test); nested(branch.body); } nested(node.otherwise); }
      else if (node.kind === 'while') { expression(node.test); nested(node.body); }
      else if (node.kind === 'repeat') nested(node.body, [], node.test);
      else if (node.kind === 'for') { expression(node.start); expression(node.stop); expression(node.step); nested(node.body, [node.variable]); }
      else if (node.kind === 'forin') { node.values.forEach(expression); nested(node.body, node.names); }
    }
  };
  statements(prototype.body); return [...free];
}
