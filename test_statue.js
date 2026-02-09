import { mksobj, setLevelDepth } from './js/mkobj.js';
import { STATUE } from './js/objects.js';
import { initRng, getRngLog, enableRngLog } from './js/rng.js';
import { init_objects } from './js/o_init.js';

// Initialize
enableRngLog(true);
initRng(16);
init_objects();
setLevelDepth(3);

// Log before
const beforeLen = getRngLog().length;
console.log('RNG calls before mksobj:', beforeLen);

// Create a statue with init=true
const statue = mksobj(STATUE, true, false);

// Log after
const afterLen = getRngLog().length;
const consumed = afterLen - beforeLen;
console.log('RNG calls after mksobj:', afterLen);
console.log('Calls consumed:', consumed);
console.log('Statue corpsenm:', statue.corpsenm);
console.log('Statue oclass:', statue.oclass);

if (consumed > 0) {
    console.log('\nNew RNG calls:');
    const fullLog = getRngLog();
    for (let i = beforeLen; i < afterLen; i++) {
        console.log(`  [${i}]: ${fullLog[i]}`);
    }
}
