// Configured NetHack typedefs and header field aliases; no C mechanics.
export const typeAliases={coord:'nhcoord',NhRect:'nhrect',boolean:'signed char',coordxy:'short',schar:'signed char',uchar:'unsigned char',uint8:'unsigned char',uint16:'unsigned short',uint32:'unsigned int',uint64:'unsigned long',int8:'signed char',int16:'short',int32:'int',int64:'long',genericptr_t:'void *',size_t:'unsigned long',time_t:'long',anything:'any',winid:'int',aligntyp:'signed char'};
// Object-like member aliases from rm.h, obj.h and objclass.h. These are
// alternate names for the same bytes, including union member paths.
export const fieldAliases={
 trap:{teledest:'launch',launch_otyp:'vl.v_launch_otyp',launch2:'vl.v_launch2',conjoined:'vl.v_conjoined',tnote:'vl.v_tnote'},
 instance_flags:{eight_bit_tty:'wc_eight_bit_input',use_color:'wc_color',hilite_pet:'wc_hilite_pet',use_inverse:'wc_inverse',large_font:'obsolete',popup_dialog:'wc_popup_dialog',preload_tiles:'wc_preload_tiles'},
 rm:{doormask:'flags',altarmask:'flags',wall_info:'flags',ladder:'flags',drawbridgemask:'flags',looted:'flags',icedpool:'flags',emptygrave:'flags',arboreal_sdoor:'candig',blessedftn:'horizontal',disturbed:'horizontal'},
 obj:{nexthere:'v.v_nexthere',ocontainer:'v.v_ocontainer',ocarry:'v.v_ocarry',on_ice:'recharged',orotten:'oeroded',odiluted:'oeroded',norevive:'oeroded2',degraded_horn:'obroken',opoisoned:'otrapped',leashmon:'corpsenm',fromsink:'corpsenm',novelidx:'corpsenm',migr_species:'corpsenm',next_boulder:'corpsenm',spestudied:'usecount',wishedfor:'usecount'},
 objclass:{oc_bimanual:'oc_big',oc_bulky:'oc_big',oc_skill:'oc_subtyp',oc_armcat:'oc_subtyp',oc_hitbon:'oc_oc1',a_ac:'oc_oc1',a_can:'oc_oc2',oc_level:'oc_oc2'},
};
