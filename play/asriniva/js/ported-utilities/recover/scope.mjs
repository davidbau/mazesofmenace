export let C;
export function withEnvironment(environment,callback,...args){const prior=C;C=environment;try{return callback(...args);}finally{C=prior;}}
