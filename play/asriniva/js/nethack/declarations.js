// Configured NetHack typedefs and header field aliases; no C mechanics.
export const typeAliases={coord:'nhcoord',NhRect:'nhrect',boolean:'signed char',coordxy:'short',schar:'signed char',uchar:'unsigned char',uint8:'unsigned char',uint16:'unsigned short',uint32:'unsigned int',uint64:'unsigned long',int8:'signed char',int16:'short',int32:'int',int64:'long',genericptr_t:'void *',size_t:'unsigned long',time_t:'long',anything:'any',winid:'int',aligntyp:'signed char'};
export const fieldAliases={
    obj:{leashmon:'corpsenm',opoisoned:'otrapped',odiluted:'oeroded',orotten:'oeroded'},
    objclass:{oc_level:'oc_oc2',oc_bimanual:'oc_big',oc_skill:'oc_subtyp',oc_armcat:'oc_subtyp',a_ac:'oc_oc1'},
    rm:{doormask:'flags',wall_info:'flags',drawbridgemask:'flags'},
};
