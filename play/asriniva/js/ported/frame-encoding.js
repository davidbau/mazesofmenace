// Serialize the terminal shadow cells with the recorder's byte-oriented SGR
// and DEC character-set transitions. A capture can reuse unchanged rows.
import {encodeRecorderScreen} from '../wasm-replay-support.js';

const characters = Array.from({length: 256}, (_, i) => String.fromCharCode(i));
const foreground = Array.from({length: 256}, (_, i) =>
    '\x1b[' + (i <= 7 ? 30 + i : i <= 15 ? 90 + i - 8 : 37) + 'm');
const width = 80;
const height = 24;
const cellSize = 4;

function verifyFrame(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length !== height * width * cellSize)
        throw new TypeError('Review native frame dimensions');
}

function serializeRow(bytes, row) {
  let end=79,fg=7,attr=0,dec=false,line='';
  while(end>=0){const at=(row*80+end)*4;if((bytes[at]!==32&&bytes[at]!==0)||bytes[at+2]!==0||(bytes[at+1]!==7&&bytes[at+1]!==0))break;end--;}
  for(let col=0;col<=end;col++){
   const at=(row*80+col)*4,nextFg=bytes[at+1]||7,nextAttr=bytes[at+2];
   if(nextAttr!==attr){
    if((nextAttr&1)&&!(attr&1))line+='\x1b[7m';
    if(!(nextAttr&1)&&(attr&1))line+='\x1b[27m';
    if((nextAttr&2)&&!(attr&2))line+='\x1b[1m';
    if(!(nextAttr&2)&&(attr&2))line+='\x1b[22m';
    if((nextAttr&4)&&!(attr&4))line+='\x1b[4m';
    if(!(nextAttr&4)&&(attr&4))line+='\x1b[24m';
    attr=nextAttr;
   }
   if(nextFg!==fg){line+=nextFg===7?'\x1b[39m':foreground[nextFg];fg=nextFg;}
   const nextDec=Boolean(bytes[at+3]);if(nextDec!==dec){line+=nextDec?'\x0e':'\x0f';dec=nextDec;}
   line+=characters[bytes[at]||32];
  }
  if(dec)line+='\x0f';
  if(attr)line+='\x1b[0m';else if(fg!==7)line+='\x1b[39m';
  return line;
}

export function serializeNativeFrame(bytes) {
    verifyFrame(bytes);
    return Array.from({length: height}, (_, row) => serializeRow(bytes, row)).join('\n');
}

export function createRecorderFrameEncoder() {
    const previous = new Uint32Array(height * width);
    const raw = new Array(height);
    const encoded = new Array(height);
    const split = new Uint8Array(height);

    return bytes => {
        verifyFrame(bytes);
        // Character, foreground, attributes and DEC state are all relevant.
        // The uint32 is used for equality only, independent of byte order.
        const cells = bytes.byteOffset % 4 === 0
            ? new Uint32Array(bytes.buffer, bytes.byteOffset, previous.length)
            : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const aligned = cells instanceof Uint32Array;
        for (let row = 0; row < height; row++) {
            const first = row * width;
            const stop = first + width;
            let changed = raw[row] === undefined;
            for (let i = first; i < stop; i++) {
                const cell = aligned ? cells[i] : cells.getUint32(i * cellSize, true);
                if (previous[i] !== cell) {
                    previous[i] = cell;
                    changed = true;
                }
            }
            if (changed) {
                const line = serializeRow(bytes, row);
                raw[row] = line;
                split[row] = Number(line.includes('\n'));
                // Spaces are compressed independently of terminal attributes.
                encoded[row] = line.replace(/ +$/u, '')
                    .replace(/ {5,}/g, spaces => `\x1b[${spaces.length}C`);
            }
        }
        // A literal newline in a cell is treated as a line break by the
        // recorder codec and affects the frame's physical row limit.
        if (split.includes(1))
            return encodeRecorderScreen(raw.join('\n'));
        let end = encoded.length;
        while (end && encoded[end - 1] === '')
            end--;
        return encoded.slice(0, end).join('\n');
    };
}
