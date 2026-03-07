// Async keyboard input queue for Rogue browser port.
// Identical to hack/js/input.js.

export class Input {
  constructor() {
    this._queue = [];
    this._resolve = null;
    this._bound = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._bound);
  }

  _onKeyDown(e) {
    let ch = null;
    if (e.key.length === 1) {
      ch = e.key;
    } else {
      switch (e.key) {
        case 'ArrowLeft':  ch = 'h'; break;
        case 'ArrowRight': ch = 'l'; break;
        case 'ArrowUp':    ch = 'k'; break;
        case 'ArrowDown':  ch = 'j'; break;
        case 'Escape':     ch = '\x1b'; break;
        case 'Enter':      ch = '\r'; break;
        case 'Backspace':  ch = '\b'; break;
        case ' ':          ch = ' '; break;
      }
    }
    if (ch === null) return;

    if ('hjklyubn'.includes(ch) || e.key.startsWith('Arrow')) {
      e.preventDefault();
    }

    if (this._resolve) {
      const res = this._resolve;
      this._resolve = null;
      res(ch);
    } else {
      this._queue.push(ch);
    }
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

  destroy() {
    document.removeEventListener('keydown', this._bound);
  }
}
