export let C;
export function withEnvironment(env, fn, ...args) {
    const prior = C;
    C = env;
    try { return fn(...args); }
    finally { C = prior; }
}
