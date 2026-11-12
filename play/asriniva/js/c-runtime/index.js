// Public runtime surface. Application declarations and platform services are
// supplied by the caller; this module never imports translated game policies.
export {CMemory} from './heap.js';
export {createCStdlib} from './stdlib.js';
export {createCTime} from './time.js';
export {CVFS,VFSError} from './vfs.js';
export {address,createMemoryServices} from './memory.js';
export {createCTypes} from './types.js';
export {createBitfields} from './bitfields.js';
export {createRecordViews} from './record-views.js';
export {createFunctions,CExit} from './functions.js';
export {createLinker} from './linker.js';
export {createAddressBindings} from './address-bindings.js';
export {createStdio} from './stdio.js';
export {createStandaloneLibc as createLibc} from './libc.js';
export {scanFormatted} from './scanf.js';
export {muslQsort} from './qsort.js';
export {createEnvironmentInputs} from './environment-inputs.js';
export {createRuntime} from './runtime.js';
export {descriptorArray,writeIntegerCell,narrowInteger,writeDescriptor,readIntegerCell,scalarMethod,advanceDescriptor,defineScalarField,pointerSequence,definePointerField,initializeRecord,indexedArray,typeSize,formatShape,readDescriptor,writeTypedValue,decodeDescriptor,defineScalarValue} from './adapter-memory.js';
export {C,R,T,withCEnvironment} from './context.js';
export {createLibraryBindings} from './library-bindings.js';
export {createRegexAbi} from './regex-abi.js';
export {createScalarAdapter,callWithStack} from './adapter-factories.js';
