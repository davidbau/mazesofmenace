/* JavaScript-owned addressable memory for the incremental C runtime migration.
 * Numeric addresses and LP64 fields remain explicit; no WebAssembly is used.
 * Allocator addresses need not equal native malloc addresses. Live allocation
 * identity, alignment, retained bytes and null/failure behavior are preserved.
 * Invalid/double frees and out-of-range accesses throw rather than emulate C UB.
 */
const ALIGN = 16;
const aligned = size => Math.ceil(size / ALIGN) * ALIGN;

// The input is the allocator-owned sorted, coalesced free list.
function insertFreeRange(previous,released){
    const address=released.address,length=previous.length;let index;
    if(address>=previous[length-1].address)index=length;
    else if(address<previous[0].address)index=0;
    else{let low=0,high=length;while(low<high){const mid=Math.floor((low+high)/2);if(previous[mid].address<=address)low=mid+1;else high=mid;}index=low;}
    if(index===length)previous.push(released);else if(index===0)previous.unshift(released);else previous.splice(index,0,released);
    const left=index?previous[index-1]:null,right=index<length?previous[index+1]:null;
    const joinsLeft=Boolean(left&&left.address+left.capacity===address),joinsRight=Boolean(right&&address+released.capacity===right.address);
    const survivor=joinsLeft?left:released;
    if(joinsLeft)survivor.capacity+=released.capacity;
    if(joinsRight)survivor.capacity+=right.capacity;
    const removed=Number(joinsLeft)+Number(joinsRight);
    if(previous.length-removed===1)return[survivor];
    const merged=previous.slice();if(removed){const at=index+(joinsLeft?0:1);merged.copyWithin(at,at+removed);merged.length-=removed;}return merged;
}

export class CMemory {
    constructor({ initialBytes = 65536, maximumBytes = 64 * 1024 * 1024 } = {}) {
        if (!Number.isSafeInteger(initialBytes) || !Number.isSafeInteger(maximumBytes)
            || initialBytes < 64 || maximumBytes < initialBytes)
            throw new RangeError('Invalid C memory capacity');
        this.buffer = new ArrayBuffer(initialBytes);
        this.maximumBytes = maximumBytes;
        this.end = ALIGN; // Reserve address zero, including a small null guard.
        this.live = new Map();
        this.available = [];
        this.generation = 0;
    }
    // Match persistent heap views; a replacement buffer retires every cached view.
    get HEAPU8() { if(!this._heapU8||this._heapU8.buffer!==this.buffer)this._heapU8=new Uint8Array(this.buffer);return this._heapU8; }
    get HEAP8() { if(!this._heap8||this._heap8.buffer!==this.buffer)this._heap8=new Int8Array(this.buffer);return this._heap8; }
    get view() { if(!this._dataView||this._dataView.buffer!==this.buffer)this._dataView=new DataView(this.buffer);return this._dataView; }
    onGrow(listener) {if(typeof listener!=='function')throw new TypeError('Growth listener must be a function');this._growListeners??=new Set();this._growListeners.add(listener);return()=>this._growListeners.delete(listener);}
    bounds(address, length = 1) {
        if (!Number.isSafeInteger(address) || !Number.isSafeInteger(length)
            || address < ALIGN || length < 0 || address + length > this.buffer.byteLength)
            throw new RangeError('C memory access outside addressable range');
        return address;
    }
    grow(required) {
        if (required <= this.buffer.byteLength) return true;
        if (required > this.maximumBytes) return false;
        const size = Math.max(required, Math.min(this.maximumBytes, this.buffer.byteLength * 2));
        try {
            const replacement = new ArrayBuffer(size);
            new Uint8Array(replacement).set(this.HEAPU8);
            this.buffer = replacement;
            this._heapU8=this._heap8=this._dataView=undefined;
            this.generation++;
        } catch (error) {
            if (error instanceof RangeError) return false;
            throw error;
        }
        if(this._growListeners)for(const listener of this._growListeners)listener();
        return true;
    }
    malloc(size) {
        if (!Number.isSafeInteger(size) || size < 0 || size > this.maximumBytes) return 0;
        const capacity = aligned(Math.max(size, 1));
        const index = this.available.findIndex(block => block.capacity >= capacity);
        let address;
        if (index >= 0) {
            const block = this.available[index];
            address = block.address;
            if (block.capacity === capacity) this.available.splice(index, 1);
            else { block.address += capacity; block.capacity -= capacity; }
        } else {
            address = this.end;
            if (!this.grow(address + capacity)) return 0;
            this.end += capacity;
        }
        this.live.set(address, { size, capacity });
        return address;
    }
    calloc(count, size) {
        const length = count * size;
        if (!Number.isSafeInteger(count) || !Number.isSafeInteger(size)
            || count < 0 || size < 0 || !Number.isSafeInteger(length)) return 0;
        const address = this.malloc(length);
        if (address) this.HEAPU8.fill(0, address, address + length);
        return address;
    }
    free(address) {
        if (address === 0) return;
        const block = this.live.get(address);
        if (!block) throw new RangeError('Invalid or repeated C memory free');
        this.live.delete(address);
        const previous=this.available,released={address,capacity:block.capacity};
        if(!previous.length){previous.push(released);this.available=[released];return;}
        this.available=insertFreeRange(previous,released);
    }

    realloc(address, size) {
        if (address === 0) return this.malloc(size);
        const block = this.live.get(address);
        if (!block) throw new RangeError('Invalid C memory realloc');
        if (!Number.isSafeInteger(size) || size < 0 || size > this.maximumBytes) return 0;
        if (size === 0) { this.free(address); return 0; }
        if (size <= block.capacity) { block.size = size; return address; }
        const replacement = this.malloc(size);
        if (!replacement) return 0;
        this.HEAPU8.copyWithin(replacement, address, address + Math.min(size, block.size));
        this.free(address);
        return replacement;
    }
    memcpy(destination, source, length) {
        if (!length) return destination;
        this.bounds(destination, length); this.bounds(source, length);
        this.HEAPU8.copyWithin(destination, source, source + length);
        return destination;
    }
    memmove(destination, source, length) { return this.memcpy(destination, source, length); }
    memset(destination, byte, length) {
        if (!length) return destination;
        this.bounds(destination, length);
        this.HEAPU8.fill(byte & 255, destination, destination + length);
        return destination;
    }
    memcmp(left, right, length) {
        if (!length) return 0;
        this.bounds(left, length); this.bounds(right, length);
        const bytes = this.HEAPU8;
        for (let i = 0; i < length; i++) if (bytes[left + i] !== bytes[right + i])
            return bytes[left + i] - bytes[right + i];
        return 0;
    }
    strlen(address) {
        this.bounds(address);
        const bytes = this.HEAPU8;
        const end = bytes.indexOf(0, address);
        if (end < 0) throw new RangeError('Unterminated C string');
        return end - address;
    }
    readBytes(address, length) {
        if (!length) return new Uint8Array(0);
        this.bounds(address, length);
        return this.HEAPU8.slice(address, address + length);
    }
    readString(address) {
        const bytes = this.readBytes(address, this.strlen(address));
        let result = '';
        for (const byte of bytes) result += String.fromCharCode(byte);
        return result;
    }
    writeString(address, input) {
        const bytes = typeof input === 'string' ? CMemory.byteString(input) : input;
        if (!(bytes instanceof Uint8Array)) throw new TypeError('Expected C byte string');
        this.bounds(address, bytes.length + 1);
        this.HEAPU8.set(bytes, address);
        this.HEAPU8[address + bytes.length] = 0;
        return address;
    }
    cstring(input) {
        const bytes = typeof input === 'string' ? CMemory.byteString(input) : input;
        if (!(bytes instanceof Uint8Array)) throw new TypeError('Expected C byte string');
        const address = this.malloc(bytes.length + 1);
        if (!address) throw new RangeError('C string allocation failed');
        this.writeString(address, bytes);
        return address;
    }
    static byteString(input) {
        const bytes = new Uint8Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const byte = input.charCodeAt(i);
            if (byte > 255) throw new TypeError('C byte strings require explicit UTF-8 encoding');
            bytes[i] = byte;
        }
        return bytes;
    }
    withScope(callback) {
        const temporaries = [];
        const scope = {
            alloc: size => {
                const address = this.malloc(size);
                if (!address) throw new RangeError('C temporary allocation failed');
                temporaries.push({ address, allocation: this.live.get(address) }); return address;
            },
            cstring: value => {
                const address = this.cstring(value);
                temporaries.push({ address, allocation: this.live.get(address) }); return address;
            },
        };
        try {
            const result = callback(scope);
            if (result && typeof result.then === 'function')
                throw new TypeError('C memory scopes must be synchronous');
            return result;
        } finally {
            for (let i = temporaries.length - 1; i >= 0; i--) {
                const temporary = temporaries[i];
                if (this.live.get(temporary.address) === temporary.allocation) this.free(temporary.address);
            }
        }
    }
}
