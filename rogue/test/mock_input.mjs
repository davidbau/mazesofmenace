/**
 * mock_input.mjs — DOM-free Input adapter for Node.js testing.
 * Implements the same interface as rogue/js/input.js.
 */

export class MockInput {
  constructor() {
    this._queue = [];
    this._resolve = null;
  }

  inject(ch) {
    if (this._resolve) {
      const res = this._resolve;
      this._resolve = null;
      res(ch);
    } else {
      this._queue.push(ch);
    }
  }

  injectAll(keys) {
    for (const ch of keys) this.inject(ch);
  }

  getKey() {
    if (this._queue.length > 0) {
      return Promise.resolve(this._queue.shift());
    }
    return new Promise(resolve => {
      this._resolve = resolve;
    });
  }

  destroy() {}
}
