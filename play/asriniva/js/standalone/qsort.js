/* Copyright (C) 2011 by Valentin Ochs
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 * Minor changes by Rich Felker for integration in musl, 2011-04-27.
 */
// Byte-pointer smoothsort transport from the pinned SDK's musl qsort.c.
// The two size_t words are represented by a single 128-bit unsigned BigInt.
export function muslQsort(memory,base,count,width,compare) {
    base=Number(base);count=Number(count);width=Number(width);
    if(![base,count,width].every(Number.isSafeInteger)||base<0||count<0||width<0||!Number.isSafeInteger(count*width))throw new RangeError('Invalid qsort range');
    const size=count*width;if(!size)return;
    memory.bounds(base,size);
    const lp=[width,width],mask=(1n<<128n)-1n;
    for(let i=2;(lp[i]=lp[i-2]+lp[i-1]+width)<size;i++);
    const ntz=value=>{let n=0;while(!(value&1n)){value>>=1n;n++;}return n;};
    const pntz=p=>p===1n?0:ntz(p-1n);
    function cycle(ar) {
        if(ar.length<2)return;
        for(let offset=0;offset<width;offset+=256) {
            const n=Math.min(256,width-offset),bytes=memory.HEAPU8.slice(ar[0]+offset,ar[0]+offset+n);
            for(let i=0;i<ar.length-1;i++)memory.memcpy(ar[i]+offset,ar[i+1]+offset,n);
            memory.HEAPU8.set(bytes,ar.at(-1)+offset);
        }
    }
    function sift(head,pshift) {
        const ar=[head];
        while(pshift>1) {
            const rt=head-width,lf=head-width-lp[pshift-2];
            if(compare(ar[0],lf)>=0&&compare(ar[0],rt)>=0)break;
            if(compare(lf,rt)>=0){ar.push(lf);head=lf;pshift--;}
            else {ar.push(rt);head=rt;pshift-=2;}
        }
        cycle(ar);
    }
    function trinkle(head,p,pshift,trusty) {
        const ar=[head];
        while(p!==1n) {
            const stepson=head-lp[pshift];
            if(compare(stepson,ar[0])<=0)break;
            if(!trusty&&pshift>1) {
                const rt=head-width,lf=head-width-lp[pshift-2];
                if(compare(rt,stepson)>=0||compare(lf,stepson)>=0)break;
            }
            ar.push(stepson);head=stepson;
            const trail=pntz(p);p>>=BigInt(trail);pshift+=trail;trusty=false;
        }
        if(!trusty){cycle(ar);sift(head,pshift);}
    }
    let p=1n,pshift=1,head=base;const high=base+size-width;
    while(head<high) {
        if((p&3n)===3n){sift(head,pshift);p>>=2n;pshift+=2;}
        else {
            if(lp[pshift-1]>=high-head)trinkle(head,p,pshift,false);else sift(head,pshift);
            if(pshift===1){p=(p<<1n)&mask;pshift=0;}
            else {p=(p<<BigInt(pshift-1))&mask;pshift=1;}
        }
        p|=1n;head+=width;
    }
    trinkle(head,p,pshift,false);
    while(pshift!==1||p!==1n) {
        if(pshift<=1){const trail=pntz(p);p>>=BigInt(trail);pshift+=trail;}
        else {
            p=(p<<2n)&mask;pshift-=2;p^=7n;p>>=1n;
            trinkle(head-lp[pshift]-width,p,pshift+1,true);
            p=(p<<1n|1n)&mask;trinkle(head-width,p,pshift,true);
        }
        head-=width;
    }
}
