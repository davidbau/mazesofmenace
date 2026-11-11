export let C;
export function withEnvironment(environment,callback,...args){const previous=C;C=environment;try{return callback(...args);}finally{C=previous;}}
