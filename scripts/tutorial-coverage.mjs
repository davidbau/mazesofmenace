#!/usr/bin/env node
import fs from 'fs';

function usage() {
  console.error('Usage: node scripts/tutorial-coverage.mjs <session.json>');
  process.exit(2);
}

function cleanScreen(screen) {
  return String(screen || '')
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/[\x0e\x0f]/g, '');
}

const sessionPath = process.argv[2];
if (!sessionPath) usage();
if (!fs.existsSync(sessionPath)) {
  console.error(`Not found: ${sessionPath}`);
  process.exit(2);
}

const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
const steps = Array.isArray(session.steps) ? session.steps : [];

const checks = [
  ['move diagonally', /diagonal/i],
  ['open door', /open.*door|door opens/i],
  ['close door', /close.*door|door closes|closed/i],
  ['look command (;)', /what do you want to look at|move cursor/i],
  ['look at water', /pool|water/i],
  ['wear armor', /you are now wearing|you finish your dressing/i],
  ['wield weapon', /you are now wielding|wield/i],
  ['combat', /you hit|you kill|hits!|misses/i],
  ['pick up', /you pick up|you see here/i],
  ['throw workflow', /what do you want to throw|you throw|thrown/i],
  ['cursed armor handling', /it is cursed|cannot remove|you can't\.  it is cursed/i],
  ['read scroll', /as you read|this scroll/i],
  ['read spellbook', /you begin to memorize|you add .* to your repertoire/i],
  ['cast spell', /you cast|in what direction|magic missile|strikes/i],
  ['quaff object detection', /presence of objects|object detection|objects .* map/i],
  ['zap secret-door-detection wand', /secret door|detect .* secret/i],
  ['squeeze past boulders', /squeeze yourself into a small opening|squeeze yourself between/i],
  ['eat food', /you eat|you finish eating|delicious/i],
  ['find hidden/trap', /you find a hidden door|you find.*trap/i],
  ['trigger trap door', /a trap door|fall through/i],
  ['reach Tutorial:2', /Tutorial:2/],
];

const results = checks.map(([label, re]) => {
  let step = -1;
  let line = '';
  for (let i = 0; i < steps.length; i++) {
    const s = cleanScreen(steps[i]?.screen);
    if (re.test(s)) {
      step = i;
      line = (s.split('\n').find((ln) => re.test(ln)) || '').trim();
      break;
    }
  }
  return { label, ok: step >= 0, step: step >= 0 ? step : null, line };
});

const okCount = results.filter((r) => r.ok).length;
const out = {
  session: sessionPath,
  steps: steps.length,
  passed: okCount,
  total: results.length,
  checks: results,
};

console.log(JSON.stringify(out, null, 2));
process.exit(okCount === results.length ? 0 : 1);
