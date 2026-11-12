// Darwin's Bentley/McIlroy partition and insertion schedule, including its
// smaller-partition-first recursion and limited insertion-sort optimization.
// Source: https://github.com/apple-oss-distributions/Libc/blob/main/stdlib/FreeBSD/qsort.c
// Copyright (c) 1992, 1993 The Regents of the University of California.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided this copyright notice and disclaimer
// are retained. Neither the University's nor contributors' names may endorse
// derived products without prior written permission. THIS SOFTWARE IS PROVIDED
// AS IS, WITHOUT EXPRESS OR IMPLIED WARRANTIES, INCLUDING MERCHANTABILITY OR
// FITNESS FOR A PARTICULAR PURPOSE. COPYRIGHT HOLDERS AND CONTRIBUTORS ARE NOT
// LIABLE FOR DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY OR CONSEQUENTIAL
// DAMAGES ARISING IN ANY WAY OUT OF ITS USE, EVEN IF ADVISED OF THE POSSIBILITY.
export function nativeQsort(heap, base, count, size, compare) {
    base=Number(base);count=Number(count);size=Number(size);
    if(count<2||!size)return;
    const cmp=(a,b)=>compare(base+a*size,base+b*size);
    const swap=(a,b)=>{
        if(a===b)return;
        const bytes=heap().slice(base+a*size,base+(a+1)*size);
        heap().copyWithin(base+a*size,base+b*size,base+(b+1)*size);
        heap().set(bytes,base+b*size);
    };
    const vector=(a,b,n)=>{for(let i=0;i<n;i++)swap(a+i,b+i);};
    const med3=(a,b,c)=>cmp(a,b)<0?(cmp(b,c)<0?b:cmp(a,c)<0?c:a):
        (cmp(b,c)>0?b:cmp(a,c)<0?a:c);
    const insertion=(lo,n,limit=0)=>{
        let swaps=0;
        for(let p=lo+1;p<lo+n;p++)for(let q=p;q>lo&&cmp(q-1,q)>0;q--){
            swap(q,q-1);if(limit&&++swaps>limit)return false;
        }
        return true;
    };
    const heapsort=(lo,n)=>{
        const sift=(root,end)=>{while(root*2+1<=end){let c=root*2+1;
            if(c<end&&cmp(lo+c,lo+c+1)<0)c++;
            if(cmp(lo+root,lo+c)>=0)break;
            swap(lo+root,lo+c);root=c;
        }};
        for(let root=Math.floor(n/2)-1;root>=0;root--)sift(root,n-1);
        for(let end=n-1;end>0;end--){swap(lo,lo+end);sift(0,end-1);}
    };
    function sort(lo,n,depth){
        for(;;){
            if(depth--<=0){heapsort(lo,n);return;}
            if(n<=7){insertion(lo,n);return;}
            let pl=lo,pm=lo+Math.floor(n/2),pn=lo+n-1;
            if(n>40){const d=Math.floor(n/8);pl=med3(pl,pl+d,pl+2*d);
                pm=med3(pm-d,pm,pm+d);pn=med3(pn-2*d,pn-d,pn);}
            pm=med3(pl,pm,pn);swap(lo,pm);
            let pa=lo+1,pb=pa,pc=lo+n-1,pd=pc,swapped=false,r;
            for(;;){
                while(pb<=pc&&(r=cmp(pb,lo))<=0){if(!r){swapped=true;swap(pa++,pb);}pb++;}
                while(pb<=pc&&(r=cmp(pc,lo))>=0){if(!r){swapped=true;swap(pc,pd--);}pc--;}
                if(pb>pc)break;
                swap(pb++,pc--);swapped=true;
            }
            pn=lo+n;
            let d=Math.min(pa-lo,pb-pa);vector(lo,pb-d,d);
            d=Math.min(pd-pc,pn-pd-1);vector(pb,pn-d,d);
            if(!swapped&&insertion(lo,n,1+Math.floor(n/4)))return;
            const left=pb-pa,right=pd-pc;
            if(left<=right){if(left>1)sort(lo,left,depth);if(right<=1)return;lo=pn-right;n=right;}
            else{if(right>1)sort(pn-right,right,depth);if(left<=1)return;n=left;}
        }
    }
    sort(0,count,2*Math.floor(Math.log2(count)));
}
