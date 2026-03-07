#!/usr/bin/env node
/**
 * play_session.mjs — AI player that generates multi-level Rogue sessions.
 *
 * Uses node_runner's runSessionWithAI to drive the game, reading the screen
 * via BFS to navigate toward stairs and explore unexplored rooms.
 *
 * Usage:
 *   node play_session.mjs --seed N [--steps 300]
 *   Prints the key sequence to stdout (feed to C harness to generate JSON).
 */

import { parseArgs } from 'util';
import { runSessionWithAI } from './node_runner.mjs';

// ── Pathfinding ───────────────────────────────────────────────────────────────

const ROWS = 24, COLS = 80;

function isPassable(ch) { return ch !== ' ' && ch !== '-' && ch !== '|'; }

/**
 * BFS on a screen represented as an array of 80-char strings (0-based).
 * Returns the first step from start toward the nearest cell matching isTarget,
 * or null if unreachable. Targets may be impassable (visited but not queued).
 */
function bfsFirstStep(rows, start, isTarget) {
  const vis = new Uint8Array(ROWS * COLS);
  const par = new Int32Array(ROWS * COLS).fill(-1);
  const si  = start.y * COLS + start.x;
  vis[si] = 1;
  const q = [si];
  let found = -1;
  const D8 = [[-1,0],[1,0],[0,-1],[0,1]]; // cardinal only — Rogue blocks diagonal through doors

  outer: while (q.length > 0) {
    const cur = q.shift();
    const cy = (cur / COLS) | 0, cx = cur % COLS;
    for (const [dy, dx] of D8) {
      const ny = cy + dy, nx = cx + dx;
      if (ny < 0 || ny >= ROWS || nx < 0 || nx >= COLS) continue;
      const ni = ny * COLS + nx;
      if (vis[ni]) continue;
      vis[ni] = 1;
      par[ni] = cur;
      if (isTarget(ny, nx)) { found = ni; break outer; }
      const ch = rows[ny]?.[nx] ?? ' ';
      if (!isPassable(ch)) continue;
      q.push(ni);
    }
  }

  if (found === -1) return null;
  let cur = found;
  while (par[cur] !== si) {
    const p = par[cur];
    if (p === -1 || p === si) break;
    cur = p;
  }
  return { y: (cur / COLS) | 0, x: cur % COLS };
}

function dirKey(dy, dx) {
  return ({'-1,0':'k','1,0':'j','0,-1':'h','0,1':'l',
           '-1,-1':'y','-1,1':'u','1,-1':'b','1,1':'n'})[`${dy},${dx}`] || 'h';
}

function findChar(rows, ch) {
  for (let y = 1; y < ROWS - 1; y++) {
    const x = (rows[y] || '').indexOf(ch);
    if (x >= 0) return { y, x };
  }
  return null;
}

// ── AI State ──────────────────────────────────────────────────────────────────

function makeAI(maxSteps) {
  let step = 0, levelSteps = 0, level = 1;
  let lastPos = null, stuck = 0, stuckDir = 0, lastKey = 'h';
  let visited = new Set();
  let blocked = new Set(); // cells where moves have failed
  let knownStairs = null; // last known stairs position

  return function keyProvider(screen, stepNum) {
    if (step >= maxSteps) return null;
    step++;
    levelSteps++;

    const topLine = screen[0] || '';
    if (topLine.includes('--More--')) return ' ';
    if (/really quit/i.test(topLine)) return 'y';
    if (/call it/i.test(topLine)) return '\x1b';

    const player = findChar(screen, '@');
    if (!player) return 'h';

    // Level tracking
    const m = (screen[23] || '').match(/Level:\s*(\d+)/);
    const lv = m ? parseInt(m[1]) : 1;
    if (lv > level) {
      level = lv; levelSteps = 0; visited.clear(); blocked.clear(); stuck = 0; knownStairs = null;
      process.stderr.write(`  → level ${lv} at step ${step}\n`);
    }

    visited.add(player.y * COLS + player.x);

    // Stuck detection: track failed moves and block those cells
    if (lastPos && lastPos.y === player.y && lastPos.x === player.x) {
      stuck++;
      // Mark the attempted direction's target as blocked (use lastKey, not stuckDir)
      const [pdy, pdx] = ({h:[0,-1],j:[1,0],k:[-1,0],l:[0,1],y:[-1,-1],u:[-1,1],b:[1,-1],n:[1,1]})[lastKey] || [0,0];
      blocked.add((player.y + pdy) * COLS + (player.x + pdx));
    } else { stuck = 0; }
    lastPos = { ...player };

    // Once stuck, keep cycling directions until we actually move
    let key;
    if (stuck > 0) {
      if (stuck >= 3) {
        stuckDir = (stuckDir + 1) % 8;
        stuck = 0;
      }
      key = 'hjklyubn'[stuckDir];
    } else {
      const cell = screen[player.y]?.[player.x];

      // Stairs: update known position when visible, descend when standing on them
      const stairs = findChar(screen, '%');
      if (stairs) knownStairs = stairs;
      // Standing on stairs: screen shows '@' there, so check against knownStairs position
      if (knownStairs && player.y === knownStairs.y && player.x === knownStairs.x) {
        lastKey = '>'; return '>';
      }

      // Navigate to stairs if known
      if (knownStairs) {
        const s = bfsFirstStep(screen, player, (y, x) => y === stairs.y && x === stairs.x);
        if (s) key = dirKey(s.y - player.y, s.x - player.x);
        else key = dirKey(Math.sign(stairs.y - player.y), Math.sign(stairs.x - player.x));
      } else {
        // Explore: find nearest unvisited '#' or frontier ' ' adjacent to passable cell
        const s = bfsFirstStep(screen, player, (y, x) => {
          if (blocked.has(y * COLS + x)) return false;
          const ch = screen[y]?.[x] ?? ' ';
          if (ch === '#' && !visited.has(y * COLS + x)) return true;
          if (ch !== ' ') return false;
          if (y <= 0 || y >= ROWS - 1) return false;
          for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const ny = y+dy, nx = x+dx;
            if (ny >= 1 && ny < ROWS-1 && nx >= 0 && nx < COLS && isPassable(screen[ny]?.[nx] ?? ' '))
              return true;
          }
          return false;
        });
        if (s) key = dirKey(s.y - player.y, s.x - player.x);
        else {
          // No frontier — search for secret doors or random walk
          if (levelSteps % 4 === 0) key = 's';
          else if (levelSteps % 25 === 0) key = '>';
          else { stuckDir = (stuckDir + 3) % 8; key = 'hjklyubn'[stuckDir]; }
        }
      }
    }
    lastKey = key;
    return key;
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { values: opts } = parseArgs({
  options: {
    seed:  { type: 'string', short: 's', default: '42' },
    steps: { type: 'string', default: '300' },
  }
});

const SEED     = parseInt(opts.seed);
const maxSteps = parseInt(opts.steps);

process.stderr.write(`Playing seed=${SEED} max=${maxSteps} steps...\n`);

let level = 1, stepCount = 0;
const ai = makeAI(maxSteps + 10); // a few extra for quit

const keys = await runSessionWithAI(SEED, (screen, stepNum, display) => {
  stepCount = stepNum;
  if (stepNum > 0 && stepNum % 50 === 0) {
    const player = findChar(screen, '@');
    const stairs = findChar(screen, '%');
    const lv = (screen[23]||'').match(/Level:\s*(\d+)/);
    process.stderr.write(
      `step ${stepNum}: lv=${lv?lv[1]:'?'} pos=${player?`${player.y},${player.x}`:'?'} ` +
      `stairs=${stairs?`${stairs.y},${stairs.x}`:'hidden'}\n`
    );
  }
  if (stepNum >= maxSteps) {
    // Append quit and signal end
    return null;
  }
  return ai(screen, stepNum);
});

// Add quit if game didn't end naturally
if (keys[keys.length-1] !== 'y') {
  keys.push('Q', 'y');
}

const keyStr = keys.join('');
process.stdout.write(keyStr);

const lv = keys.filter(k=>k==='>').length;
process.stderr.write(`\nDone: ${keys.length} total keys\n`);
process.exit(0);
