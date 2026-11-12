// Synchronous C dependency scope, outside translated TUs. Nested C→JS→C calls
// restore the previous scope even if C panic/longjmp unwinds through JS.
// Translated routines cannot retain this binding across asynchronous work.
export let C;
export let R;
export let T;

export function withCEnvironment(environment, callback, ...args) {
    const previous = C;
    const previousRect = R;
    const previousTrack = T;
    C = environment;
    R = environment.rectState;
    T = environment.trackState;
    try {
        return callback(...args);
    } finally {
        C = previous;
        R = previousRect;
        T = previousTrack;
    }
}
