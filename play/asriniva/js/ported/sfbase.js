import { C } from '../c-runtime/context.js';

/* NetHack 5.0	sfbase.c.template $NHDT-Date$  $NHDT-Branch$:$NHDT-Revision$ */
/* Copyright (c) Michael Allison, 2025. */
/* NetHack may be freely redistributed.  See license for details. */



//#include "sfproto.h"

/* #define DO_DEBUG */

//#define TURN_OFF_LOGGING 0x20

/* struct sf_structlevel_procs sfoprocs[NUM_SAVEFORMATS], sfiprocs[NUM_SAVEFORMATS],
                zerosfoprocs = {0}, zerosfiprocs = {0}; */
/* struct sf_fieldlevel_procs sfoflprocs[NUM_SAVEFORMATS], sfiflprocs[NUM_SAVEFORMATS],
                zerosfoflprocs = {0}, zerosfiflprocs = {0}; */

/* not in _Generic */ 

/*
#define SF_A(dtyp) \
void sfo_##dtyp(NHFILE *nhfp, dtyp *d_##dtyp, const char *myname)               \
{                                                                               \
    if (nhfp->fplog)                                                            \
        sf_log(nhfp, myname, sizeof *d_##dtyp, 1, Sfvalue_##dtyp(d_##dtyp));    \
    if (nhfp->structlevel) {                                                    \
        (*sfoprocs[nhfp->fnidx].fn.sf_##dtyp)(nhfp, d_##dtyp, myname);          \
    } else {                                                                    \
        let save_fplog = nhfp->fplog;                                         \
                                                                                \
        nhfp->fplog = 0;                                                        \
        (*sfoflprocs[nhfp->fnidx].fn_x.sf_##dtyp)(nhfp, d_##dtyp, myname);      \
        nhfp->fplog = save_fplog;                                               \
    }                                                                           \
}                                                                               \
                                                                                \
void sfi_##dtyp(NHFILE *nhfp, dtyp *d_##dtyp, const char *myname)               \
{                                                                               \
    if (nhfp->structlevel) {                                                    \
        (*sfiprocs[nhfp->fnidx].fn.sf_##dtyp)(nhfp, d_##dtyp, myname);          \
    } else {                                                                    \
        int save_mode = nhfp->mode;                                             \
                                                                                \
        nhfp->mode &= ~(CONVERTING | UNCONVERTING);                             \
        nhfp->mode |= TURN_OFF_LOGGING;                                         \
        (*sfiflprocs[nhfp->fnidx].fn_x.sf_##dtyp)(nhfp, d_##dtyp, myname);      \
        nhfp->mode = save_mode;                                                 \
    }                                                                           \
    if (!nhfp->eof) {                                                           \
        if ((((nhfp->mode & CONVERTING) != 0)                                   \
            || ((nhfp->mode & UNCONVERTING) != 0)) && nhfp->nhfpconvert)  {     \
            sfo_##dtyp(nhfp->nhfpconvert, d_##dtyp, myname);                    \
        }                                                                       \
        if (nhfp->fplog)                                                        \
            sf_log(nhfp, myname, sizeof *d_##dtyp, 1,                           \
                   Sfvalue_##dtyp(d_##dtyp));                                   \
    }                                                                           \
}

*/

/*
#define SF_C(keyw, dtyp) \
void sfo_##dtyp(NHFILE *nhfp, keyw dtyp *d_##dtyp, const char *myname)          \
{                                                                               \
    if (nhfp->fplog)                                                            \
        sf_log(nhfp, myname, sizeof *d_##dtyp, 1,                               \
               complex_dump((uchar *) d_##dtyp));                               \
    if (nhfp->structlevel) {                                                    \
        (*sfoprocs[nhfp->fnidx].fn.sf_##dtyp)(nhfp, d_##dtyp, myname);          \
    } else {                                                                    \
        let save_fplog = nhfp->fplog;                                         \
                                                                                \
        nhfp->fplog = 0;                                                        \
        (*sfoflprocs[nhfp->fnidx].fn_x.sf_##dtyp)(nhfp, d_##dtyp, myname);      \
        nhfp->fplog = save_fplog;                                               \
    }                                                                           \
}                                                                               \
                                                                                \
void sfi_##dtyp(NHFILE *nhfp, keyw dtyp *d_##dtyp, const char *myname)          \
{                                                                               \
    if (nhfp->structlevel) {                                                    \
        (*sfiprocs[nhfp->fnidx].fn.sf_##dtyp)(nhfp, d_##dtyp, myname);          \
    } else {                                                                    \
        int save_mode = nhfp->mode;                                             \
                                                                                \
        nhfp->mode &= ~(CONVERTING | UNCONVERTING);                             \
        nhfp->mode |= TURN_OFF_LOGGING;                                         \
        (*sfiflprocs[nhfp->fnidx].fn_x.sf_##dtyp)(nhfp, d_##dtyp, myname);      \
        nhfp->mode = save_mode;                                                 \
    }                                                                           \
    if (!nhfp->eof) {                                                           \
        if ((((nhfp->mode & CONVERTING) != 0)                                   \
            || ((nhfp->mode & UNCONVERTING) != 0))                              \
            && nhfp->nhfpconvert) {                                             \
            sfo_##dtyp(nhfp->nhfpconvert, d_##dtyp, myname);                    \
        }                                                                       \
        if (nhfp->fplog)                                                        \
            sf_log(nhfp, myname, sizeof *d_##dtyp, 1,                           \
                       complex_dump((uchar *) d_##dtyp));                       \
    }                                                                           \
}
  
*/

/*
#define SF_X(xxx, dtyp) \
void sfo_##dtyp(NHFILE *nhfp, xxx *d_##dtyp, const char *myname, int bfsz)      \
{                                                                               \
    if (nhfp->fplog)                                                            \
            sf_log(nhfp, myname, sizeof *d_##dtyp, 1,                           \
                   Sfvalue_##dtyp(d_##dtyp));                                   \
    if (nhfp->structlevel) {                                                    \
        (*sfoprocs[nhfp->fnidx].fn.sf_##dtyp)(nhfp, d_##dtyp, myname, bfsz);    \
    } else {                                                                    \
        let save_fplog = nhfp->fplog;                                         \
                                                                                \
        nhfp->fplog = 0;                                                        \
        (*sfoflprocs[nhfp->fnidx].fn_x.sf_##dtyp)(nhfp, d_##dtyp,               \
                                                  myname, bfsz);                \
        nhfp->fplog = save_fplog;                                               \
    }                                                                           \
    if (nhfp->fplog && !nhfp->eof)                                              \
        sf_log(nhfp, myname, sizeof *d_##dtyp, 1, Sfvalue_##dtyp(d_##dtyp));    \
}                                                                               \
                                                                                \
void sfi_##dtyp(NHFILE *nhfp, xxx *d_##dtyp, const char *myname, int bfsz)      \
{                                                                               \
    if (nhfp->structlevel) {                                                    \
        (*sfiprocs[nhfp->fnidx].fn.sf_##dtyp)(nhfp, d_##dtyp, myname, bfsz);    \
    } else {                                                                    \
        int save_mode = nhfp->mode;                                             \
                                                                                \
        nhfp->mode &= ~(CONVERTING | UNCONVERTING);                             \
        nhfp->mode |= TURN_OFF_LOGGING;                                         \
        (*sfiflprocs[nhfp->fnidx].fn_x.sf_##dtyp)(nhfp, d_##dtyp,               \
                                                  myname, bfsz);                \
        nhfp->mode = save_mode;                                                 \
    }                                                                           \
    if (!nhfp->eof) {                                                           \
        if ((((nhfp->mode & CONVERTING) != 0)                                   \
            || ((nhfp->mode & UNCONVERTING) != 0))                              \
                       && nhfp->nhfpconvert) {                                  \
            sfo_##dtyp(nhfp->nhfpconvert, d_##dtyp, myname, bfsz);              \
        }                                                                       \
        if (nhfp->fplog)                                                        \
            sf_log(nhfp, myname, sizeof *d_##dtyp, 1,                           \
                   dtyp##_dump(d_##dtyp));                                      \
    }                                                                           \
}

*/


/* NetHack 5.0	sfmacros.h $NHDT-Date$  $NHDT-Branch$:$NHDT-Revision$ */
/* Copyright (c) Michael Allison, 2025. */
/* NetHack may be freely redistributed.  See license for details. */

/* This file is included by sfbase.c, sfstruct.c */


export function sfo_arti_info(nhfp, d_arti_info, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.arti_info, 1,                               
               complex_dump(d_arti_info));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_arti_info(nhfp, d_arti_info, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_arti_info(nhfp, d_arti_info, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_arti_info(nhfp, d_arti_info, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_arti_info(nhfp, d_arti_info, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_arti_info(nhfp, d_arti_info, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_arti_info(nhfp.nhfpconvert, d_arti_info, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.arti_info, 1,                           
                       complex_dump(d_arti_info));                       
    }                                                                           
}

export function sfo_nhrect(nhfp, d_nhrect, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.nhrect, 1,                               
               complex_dump(d_nhrect));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_nhrect(nhfp, d_nhrect, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_nhrect(nhfp, d_nhrect, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_nhrect(nhfp, d_nhrect, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_nhrect(nhfp, d_nhrect, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_nhrect(nhfp, d_nhrect, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_nhrect(nhfp.nhfpconvert, d_nhrect, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.nhrect, 1,                           
                       complex_dump(d_nhrect));                       
    }                                                                           
}

export function sfo_branch(nhfp, d_branch, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.branch, 1,                               
               complex_dump(d_branch));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_branch(nhfp, d_branch, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_branch(nhfp, d_branch, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_branch(nhfp, d_branch, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_branch(nhfp, d_branch, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_branch(nhfp, d_branch, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_branch(nhfp.nhfpconvert, d_branch, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.branch, 1,                           
                       complex_dump(d_branch));                       
    }                                                                           
}

export function sfo_bubble(nhfp, d_bubble, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.bubble, 1,                               
               complex_dump(d_bubble));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_bubble(nhfp, d_bubble, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_bubble(nhfp, d_bubble, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_bubble(nhfp, d_bubble, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_bubble(nhfp, d_bubble, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_bubble(nhfp, d_bubble, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_bubble(nhfp.nhfpconvert, d_bubble, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.bubble, 1,                           
                       complex_dump(d_bubble));                       
    }                                                                           
}

export function sfo_cemetery(nhfp, d_cemetery, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.cemetery, 1,                               
               complex_dump(d_cemetery));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_cemetery(nhfp, d_cemetery, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_cemetery(nhfp, d_cemetery, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_cemetery(nhfp, d_cemetery, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_cemetery(nhfp, d_cemetery, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_cemetery(nhfp, d_cemetery, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_cemetery(nhfp.nhfpconvert, d_cemetery, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.cemetery, 1,                           
                       complex_dump(d_cemetery));                       
    }                                                                           
}

export function sfo_context_info(nhfp, d_context_info, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.context_info, 1,                               
               complex_dump(d_context_info));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_context_info(nhfp, d_context_info, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_context_info(nhfp, d_context_info, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_context_info(nhfp, d_context_info, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_context_info(nhfp, d_context_info, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_context_info(nhfp, d_context_info, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_context_info(nhfp.nhfpconvert, d_context_info, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.context_info, 1,                           
                       complex_dump(d_context_info));                       
    }                                                                           
}

export function sfo_nhcoord(nhfp, d_nhcoord, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.nhcoord, 1,                               
               complex_dump(d_nhcoord));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_nhcoord(nhfp, d_nhcoord, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_nhcoord(nhfp, d_nhcoord, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_nhcoord(nhfp, d_nhcoord, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_nhcoord(nhfp, d_nhcoord, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_nhcoord(nhfp, d_nhcoord, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_nhcoord(nhfp.nhfpconvert, d_nhcoord, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.nhcoord, 1,                           
                       complex_dump(d_nhcoord));                       
    }                                                                           
}

export function sfo_damage(nhfp, d_damage, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.damage, 1,                               
               complex_dump(d_damage));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_damage(nhfp, d_damage, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_damage(nhfp, d_damage, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_damage(nhfp, d_damage, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_damage(nhfp, d_damage, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_damage(nhfp, d_damage, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_damage(nhfp.nhfpconvert, d_damage, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.damage, 1,                           
                       complex_dump(d_damage));                       
    }                                                                           
}

export function sfo_dest_area(nhfp, d_dest_area, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.dest_area, 1,                               
               complex_dump(d_dest_area));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_dest_area(nhfp, d_dest_area, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_dest_area(nhfp, d_dest_area, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_dest_area(nhfp, d_dest_area, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_dest_area(nhfp, d_dest_area, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_dest_area(nhfp, d_dest_area, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_dest_area(nhfp.nhfpconvert, d_dest_area, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.dest_area, 1,                           
                       complex_dump(d_dest_area));                       
    }                                                                           
}

export function sfo_dgn_topology(nhfp, d_dgn_topology, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.dgn_topology, 1,                               
               complex_dump(d_dgn_topology));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_dgn_topology(nhfp, d_dgn_topology, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_dgn_topology(nhfp, d_dgn_topology, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_dgn_topology(nhfp, d_dgn_topology, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_dgn_topology(nhfp, d_dgn_topology, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_dgn_topology(nhfp, d_dgn_topology, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_dgn_topology(nhfp.nhfpconvert, d_dgn_topology, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.dgn_topology, 1,                           
                       complex_dump(d_dgn_topology));                       
    }                                                                           
}

export function sfo_dungeon(nhfp, d_dungeon, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.dungeon, 1,                               
               complex_dump(d_dungeon));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_dungeon(nhfp, d_dungeon, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_dungeon(nhfp, d_dungeon, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_dungeon(nhfp, d_dungeon, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_dungeon(nhfp, d_dungeon, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_dungeon(nhfp, d_dungeon, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_dungeon(nhfp.nhfpconvert, d_dungeon, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.dungeon, 1,                           
                       complex_dump(d_dungeon));                       
    }                                                                           
}

export function sfo_d_level(nhfp, d_d_level, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.d_level, 1,                               
               complex_dump(d_d_level));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_d_level(nhfp, d_d_level, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_d_level(nhfp, d_d_level, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_d_level(nhfp, d_d_level, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_d_level(nhfp, d_d_level, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_d_level(nhfp, d_d_level, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_d_level(nhfp.nhfpconvert, d_d_level, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.d_level, 1,                           
                       complex_dump(d_d_level));                       
    }                                                                           
}

export function sfo_ebones(nhfp, d_ebones, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.ebones, 1,                               
               complex_dump(d_ebones));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_ebones(nhfp, d_ebones, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_ebones(nhfp, d_ebones, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_ebones(nhfp, d_ebones, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_ebones(nhfp, d_ebones, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_ebones(nhfp, d_ebones, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_ebones(nhfp.nhfpconvert, d_ebones, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.ebones, 1,                           
                       complex_dump(d_ebones));                       
    }                                                                           
}

export function sfo_edog(nhfp, d_edog, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.edog, 1,                               
               complex_dump(d_edog));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_edog(nhfp, d_edog, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_edog(nhfp, d_edog, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_edog(nhfp, d_edog, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_edog(nhfp, d_edog, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_edog(nhfp, d_edog, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_edog(nhfp.nhfpconvert, d_edog, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.edog, 1,                           
                       complex_dump(d_edog));                       
    }                                                                           
}

export function sfo_egd(nhfp, d_egd, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.egd, 1,                               
               complex_dump(d_egd));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_egd(nhfp, d_egd, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_egd(nhfp, d_egd, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_egd(nhfp, d_egd, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_egd(nhfp, d_egd, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_egd(nhfp, d_egd, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_egd(nhfp.nhfpconvert, d_egd, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.egd, 1,                           
                       complex_dump(d_egd));                       
    }                                                                           
}

export function sfo_emin(nhfp, d_emin, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.emin, 1,                               
               complex_dump(d_emin));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_emin(nhfp, d_emin, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_emin(nhfp, d_emin, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_emin(nhfp, d_emin, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_emin(nhfp, d_emin, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_emin(nhfp, d_emin, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_emin(nhfp.nhfpconvert, d_emin, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.emin, 1,                           
                       complex_dump(d_emin));                       
    }                                                                           
}

export function sfo_engr(nhfp, d_engr, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.engr, 1,                               
               complex_dump(d_engr));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_engr(nhfp, d_engr, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_engr(nhfp, d_engr, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_engr(nhfp, d_engr, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_engr(nhfp, d_engr, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_engr(nhfp, d_engr, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_engr(nhfp.nhfpconvert, d_engr, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.engr, 1,                           
                       complex_dump(d_engr));                       
    }                                                                           
}

export function sfo_epri(nhfp, d_epri, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.epri, 1,                               
               complex_dump(d_epri));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_epri(nhfp, d_epri, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_epri(nhfp, d_epri, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_epri(nhfp, d_epri, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_epri(nhfp, d_epri, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_epri(nhfp, d_epri, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_epri(nhfp.nhfpconvert, d_epri, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.epri, 1,                           
                       complex_dump(d_epri));                       
    }                                                                           
}

export function sfo_eshk(nhfp, d_eshk, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.eshk, 1,                               
               complex_dump(d_eshk));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_eshk(nhfp, d_eshk, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_eshk(nhfp, d_eshk, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_eshk(nhfp, d_eshk, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_eshk(nhfp, d_eshk, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_eshk(nhfp, d_eshk, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_eshk(nhfp.nhfpconvert, d_eshk, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.eshk, 1,                           
                       complex_dump(d_eshk));                       
    }                                                                           
}

export function sfo_fe(nhfp, d_fe, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.fe, 1,                               
               complex_dump(d_fe));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_fe(nhfp, d_fe, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_fe(nhfp, d_fe, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_fe(nhfp, d_fe, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_fe(nhfp, d_fe, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_fe(nhfp, d_fe, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_fe(nhfp.nhfpconvert, d_fe, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.fe, 1,                           
                       complex_dump(d_fe));                       
    }                                                                           
}

export function sfo_flag(nhfp, d_flag, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.flag, 1,                               
               complex_dump(d_flag));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_flag(nhfp, d_flag, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_flag(nhfp, d_flag, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_flag(nhfp, d_flag, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_flag(nhfp, d_flag, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_flag(nhfp, d_flag, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_flag(nhfp.nhfpconvert, d_flag, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.flag, 1,                           
                       complex_dump(d_flag));                       
    }                                                                           
}

export function sfo_fruit(nhfp, d_fruit, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.fruit, 1,                               
               complex_dump(d_fruit));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_fruit(nhfp, d_fruit, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_fruit(nhfp, d_fruit, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_fruit(nhfp, d_fruit, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_fruit(nhfp, d_fruit, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_fruit(nhfp, d_fruit, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_fruit(nhfp.nhfpconvert, d_fruit, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.fruit, 1,                           
                       complex_dump(d_fruit));                       
    }                                                                           
}

export function sfo_gamelog_line(nhfp, d_gamelog_line, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.gamelog_line, 1,                               
               complex_dump(d_gamelog_line));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_gamelog_line(nhfp, d_gamelog_line, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_gamelog_line(nhfp, d_gamelog_line, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_gamelog_line(nhfp, d_gamelog_line, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_gamelog_line(nhfp, d_gamelog_line, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_gamelog_line(nhfp, d_gamelog_line, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_gamelog_line(nhfp.nhfpconvert, d_gamelog_line, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.gamelog_line, 1,                           
                       complex_dump(d_gamelog_line));                       
    }                                                                           
}

export function sfo_kinfo(nhfp, d_kinfo, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.kinfo, 1,                               
               complex_dump(d_kinfo));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_kinfo(nhfp, d_kinfo, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_kinfo(nhfp, d_kinfo, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_kinfo(nhfp, d_kinfo, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_kinfo(nhfp, d_kinfo, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_kinfo(nhfp, d_kinfo, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_kinfo(nhfp.nhfpconvert, d_kinfo, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.kinfo, 1,                           
                       complex_dump(d_kinfo));                       
    }                                                                           
}

export function sfo_levelflags(nhfp, d_levelflags, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.levelflags, 1,                               
               complex_dump(d_levelflags));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_levelflags(nhfp, d_levelflags, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_levelflags(nhfp, d_levelflags, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_levelflags(nhfp, d_levelflags, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_levelflags(nhfp, d_levelflags, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_levelflags(nhfp, d_levelflags, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_levelflags(nhfp.nhfpconvert, d_levelflags, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.levelflags, 1,                           
                       complex_dump(d_levelflags));                       
    }                                                                           
}

export function sfo_ls_t(nhfp, d_ls_t, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.ls_t, 1,                               
               complex_dump(d_ls_t));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_ls_t(nhfp, d_ls_t, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_ls_t(nhfp, d_ls_t, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_ls_t(nhfp, d_ls_t, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_ls_t(nhfp, d_ls_t, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_ls_t(nhfp, d_ls_t, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_ls_t(nhfp.nhfpconvert, d_ls_t, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.ls_t, 1,                           
                       complex_dump(d_ls_t));                       
    }                                                                           
}

export function sfo_linfo(nhfp, d_linfo, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.linfo, 1,                               
               complex_dump(d_linfo));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_linfo(nhfp, d_linfo, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_linfo(nhfp, d_linfo, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_linfo(nhfp, d_linfo, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_linfo(nhfp, d_linfo, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_linfo(nhfp, d_linfo, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_linfo(nhfp.nhfpconvert, d_linfo, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.linfo, 1,                           
                       complex_dump(d_linfo));                       
    }                                                                           
}

export function sfo_mapseen_feat(nhfp, d_mapseen_feat, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.mapseen_feat, 1,                               
               complex_dump(d_mapseen_feat));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_mapseen_feat(nhfp, d_mapseen_feat, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_mapseen_feat(nhfp, d_mapseen_feat, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_mapseen_feat(nhfp, d_mapseen_feat, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_mapseen_feat(nhfp, d_mapseen_feat, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_mapseen_feat(nhfp, d_mapseen_feat, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_mapseen_feat(nhfp.nhfpconvert, d_mapseen_feat, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.mapseen_feat, 1,                           
                       complex_dump(d_mapseen_feat));                       
    }                                                                           
}

export function sfo_mapseen_flags(nhfp, d_mapseen_flags, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.mapseen_flags, 1,                               
               complex_dump(d_mapseen_flags));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_mapseen_flags(nhfp, d_mapseen_flags, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_mapseen_flags(nhfp, d_mapseen_flags, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_mapseen_flags(nhfp, d_mapseen_flags, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_mapseen_flags(nhfp, d_mapseen_flags, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_mapseen_flags(nhfp, d_mapseen_flags, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_mapseen_flags(nhfp.nhfpconvert, d_mapseen_flags, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.mapseen_flags, 1,                           
                       complex_dump(d_mapseen_flags));                       
    }                                                                           
}

export function sfo_mapseen_rooms(nhfp, d_mapseen_rooms, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.mapseen_rooms, 1,                               
               complex_dump(d_mapseen_rooms));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_mapseen_rooms(nhfp, d_mapseen_rooms, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_mapseen_rooms(nhfp, d_mapseen_rooms, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_mapseen_rooms(nhfp, d_mapseen_rooms, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_mapseen_rooms(nhfp, d_mapseen_rooms, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_mapseen_rooms(nhfp, d_mapseen_rooms, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_mapseen_rooms(nhfp.nhfpconvert, d_mapseen_rooms, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.mapseen_rooms, 1,                           
                       complex_dump(d_mapseen_rooms));                       
    }                                                                           
}

export function sfo_mkroom(nhfp, d_mkroom, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.mkroom, 1,                               
               complex_dump(d_mkroom));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_mkroom(nhfp, d_mkroom, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_mkroom(nhfp, d_mkroom, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_mkroom(nhfp, d_mkroom, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_mkroom(nhfp, d_mkroom, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_mkroom(nhfp, d_mkroom, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_mkroom(nhfp.nhfpconvert, d_mkroom, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.mkroom, 1,                           
                       complex_dump(d_mkroom));                       
    }                                                                           
}

export function sfo_monst(nhfp, d_monst, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.monst, 1,                               
               complex_dump(d_monst));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_monst(nhfp, d_monst, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_monst(nhfp, d_monst, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_monst(nhfp, d_monst, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_monst(nhfp, d_monst, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_monst(nhfp, d_monst, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_monst(nhfp.nhfpconvert, d_monst, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.monst, 1,                           
                       complex_dump(d_monst));                       
    }                                                                           
}

export function sfo_mvitals(nhfp, d_mvitals, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.mvitals, 1,                               
               complex_dump(d_mvitals));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_mvitals(nhfp, d_mvitals, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_mvitals(nhfp, d_mvitals, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_mvitals(nhfp, d_mvitals, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_mvitals(nhfp, d_mvitals, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_mvitals(nhfp, d_mvitals, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_mvitals(nhfp.nhfpconvert, d_mvitals, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.mvitals, 1,                           
                       complex_dump(d_mvitals));                       
    }                                                                           
}

export function sfo_obj(nhfp, d_obj, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.obj, 1,                               
               complex_dump(d_obj));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_obj(nhfp, d_obj, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_obj(nhfp, d_obj, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_obj(nhfp, d_obj, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_obj(nhfp, d_obj, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_obj(nhfp, d_obj, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_obj(nhfp.nhfpconvert, d_obj, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.obj, 1,                           
                       complex_dump(d_obj));                       
    }                                                                           
}

export function sfo_objclass(nhfp, d_objclass, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.objclass, 1,                               
               complex_dump(d_objclass));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_objclass(nhfp, d_objclass, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_objclass(nhfp, d_objclass, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_objclass(nhfp, d_objclass, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_objclass(nhfp, d_objclass, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_objclass(nhfp, d_objclass, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_objclass(nhfp.nhfpconvert, d_objclass, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.objclass, 1,                           
                       complex_dump(d_objclass));                       
    }                                                                           
}

export function sfo_q_score(nhfp, d_q_score, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.q_score, 1,                               
               complex_dump(d_q_score));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_q_score(nhfp, d_q_score, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_q_score(nhfp, d_q_score, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_q_score(nhfp, d_q_score, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_q_score(nhfp, d_q_score, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_q_score(nhfp, d_q_score, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_q_score(nhfp.nhfpconvert, d_q_score, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.q_score, 1,                           
                       complex_dump(d_q_score));                       
    }                                                                           
}

export function sfo_rm(nhfp, d_rm, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.rm, 1,                               
               complex_dump(d_rm));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_rm(nhfp, d_rm, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_rm(nhfp, d_rm, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_rm(nhfp, d_rm, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_rm(nhfp, d_rm, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_rm(nhfp, d_rm, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_rm(nhfp.nhfpconvert, d_rm, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.rm, 1,                           
                       complex_dump(d_rm));                       
    }                                                                           
}

export function sfo_spell(nhfp, d_spell, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.spell, 1,                               
               complex_dump(d_spell));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_spell(nhfp, d_spell, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_spell(nhfp, d_spell, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_spell(nhfp, d_spell, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_spell(nhfp, d_spell, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_spell(nhfp, d_spell, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_spell(nhfp.nhfpconvert, d_spell, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.spell, 1,                           
                       complex_dump(d_spell));                       
    }                                                                           
}

export function sfo_stairway(nhfp, d_stairway, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.stairway, 1,                               
               complex_dump(d_stairway));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_stairway(nhfp, d_stairway, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_stairway(nhfp, d_stairway, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_stairway(nhfp, d_stairway, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_stairway(nhfp, d_stairway, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_stairway(nhfp, d_stairway, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_stairway(nhfp.nhfpconvert, d_stairway, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.stairway, 1,                           
                       complex_dump(d_stairway));                       
    }                                                                           
}

export function sfo_s_level(nhfp, d_s_level, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.s_level, 1,                               
               complex_dump(d_s_level));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_s_level(nhfp, d_s_level, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_s_level(nhfp, d_s_level, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_s_level(nhfp, d_s_level, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_s_level(nhfp, d_s_level, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_s_level(nhfp, d_s_level, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_s_level(nhfp.nhfpconvert, d_s_level, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.s_level, 1,                           
                       complex_dump(d_s_level));                       
    }                                                                           
}

export function sfo_trap(nhfp, d_trap, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.trap, 1,                               
               complex_dump(d_trap));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_trap(nhfp, d_trap, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_trap(nhfp, d_trap, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_trap(nhfp, d_trap, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_trap(nhfp, d_trap, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_trap(nhfp, d_trap, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_trap(nhfp.nhfpconvert, d_trap, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.trap, 1,                           
                       complex_dump(d_trap));                       
    }                                                                           
}

export function sfo_you(nhfp, d_you, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.you, 1,                               
               complex_dump(d_you));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_you(nhfp, d_you, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_you(nhfp, d_you, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_you(nhfp, d_you, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_you(nhfp, d_you, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_you(nhfp, d_you, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_you(nhfp.nhfpconvert, d_you, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.you, 1,                           
                       complex_dump(d_you));                       
    }                                                                           
}

export function sfo_any(nhfp, d_any, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.any, 1,                               
               complex_dump(d_any));                               
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_any(nhfp, d_any, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_any(nhfp, d_any, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_any(nhfp, d_any, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_any(nhfp, d_any, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_any(nhfp, d_any, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
            && nhfp.nhfpconvert) {                                             
            sfo_any(nhfp.nhfpconvert, d_any, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.any, 1,                           
                       complex_dump(d_any));                       
    }                                                                           
}

export function sfo_aligntyp(nhfp, d_aligntyp, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.aligntyp, 1, sfvalue_aligntyp(d_aligntyp));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_aligntyp(nhfp, d_aligntyp, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_aligntyp(nhfp, d_aligntyp, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_aligntyp(nhfp, d_aligntyp, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_aligntyp(nhfp, d_aligntyp, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_aligntyp(nhfp, d_aligntyp, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_aligntyp(nhfp.nhfpconvert, d_aligntyp, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.aligntyp, 1,                           
                   sfvalue_aligntyp(d_aligntyp));                                   
    }                                                                           
}

export function sfo_boolean(nhfp, d_boolean, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.boolean, 1, sfvalue_boolean(d_boolean));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_boolean(nhfp, d_boolean, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_boolean(nhfp, d_boolean, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_boolean(nhfp, d_boolean, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_boolean(nhfp, d_boolean, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_boolean(nhfp, d_boolean, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_boolean(nhfp.nhfpconvert, d_boolean, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.boolean, 1,                           
                   sfvalue_boolean(d_boolean));                                   
    }                                                                           
}

export function sfo_coordxy(nhfp, d_coordxy, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.coordxy, 1, sfvalue_int16(d_coordxy));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_coordxy(nhfp, d_coordxy, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_coordxy(nhfp, d_coordxy, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_coordxy(nhfp, d_coordxy, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_coordxy(nhfp, d_coordxy, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_coordxy(nhfp, d_coordxy, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_coordxy(nhfp.nhfpconvert, d_coordxy, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.coordxy, 1,                           
                   sfvalue_int16(d_coordxy));                                   
    }                                                                           
}

export function sfo_int(nhfp, d_int, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.int, 1, sfvalue_int(d_int));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_int(nhfp, d_int, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_int(nhfp, d_int, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_int(nhfp, d_int, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_int(nhfp, d_int, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_int(nhfp, d_int, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_int(nhfp.nhfpconvert, d_int, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.int, 1,                           
                   sfvalue_int(d_int));                                   
    }                                                                           
}

export function sfo_int16(nhfp, d_int16, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.int16, 1, sfvalue_int16(d_int16));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_int16(nhfp, d_int16, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_int16(nhfp, d_int16, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_int16(nhfp, d_int16, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_int16(nhfp, d_int16, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_int16(nhfp, d_int16, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_int16(nhfp.nhfpconvert, d_int16, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.int16, 1,                           
                   sfvalue_int16(d_int16));                                   
    }                                                                           
}

export function sfo_int32(nhfp, d_int32, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.int32, 1, sfvalue_int32(d_int32));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_int32(nhfp, d_int32, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_int32(nhfp, d_int32, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_int32(nhfp, d_int32, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_int32(nhfp, d_int32, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_int32(nhfp, d_int32, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_int32(nhfp.nhfpconvert, d_int32, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.int32, 1,                           
                   sfvalue_int32(d_int32));                                   
    }                                                                           
}

export function sfo_int64(nhfp, d_int64, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.int64, 1, sfvalue_int64(d_int64));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_int64(nhfp, d_int64, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_int64(nhfp, d_int64, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_int64(nhfp, d_int64, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_int64(nhfp, d_int64, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_int64(nhfp, d_int64, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_int64(nhfp.nhfpconvert, d_int64, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.int64, 1,                           
                   sfvalue_int64(d_int64));                                   
    }                                                                           
}

export function sfo_long(nhfp, d_long, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.long, 1, sfvalue_long(d_long));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_long(nhfp, d_long, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_long(nhfp, d_long, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_long(nhfp, d_long, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_long(nhfp, d_long, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_long(nhfp, d_long, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_long(nhfp.nhfpconvert, d_long, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.long, 1,                           
                   sfvalue_long(d_long));                                   
    }                                                                           
}

export function sfo_schar(nhfp, d_schar, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.schar, 1, sfvalue_schar(d_schar));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_schar(nhfp, d_schar, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_schar(nhfp, d_schar, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_schar(nhfp, d_schar, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_schar(nhfp, d_schar, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_schar(nhfp, d_schar, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_schar(nhfp.nhfpconvert, d_schar, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.schar, 1,                           
                   sfvalue_schar(d_schar));                                   
    }                                                                           
}

export function sfo_short(nhfp, d_short, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.short, 1, sfvalue_short(d_short));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_short(nhfp, d_short, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_short(nhfp, d_short, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_short(nhfp, d_short, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_short(nhfp, d_short, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_short(nhfp, d_short, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_short(nhfp.nhfpconvert, d_short, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.short, 1,                           
                   sfvalue_short(d_short));                                   
    }                                                                           
}

export function sfo_size_t(nhfp, d_size_t, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.size_t, 1, sfvalue_size_t(d_size_t));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_size_t(nhfp, d_size_t, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_size_t(nhfp, d_size_t, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_size_t(nhfp, d_size_t, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_size_t(nhfp, d_size_t, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_size_t(nhfp, d_size_t, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_size_t(nhfp.nhfpconvert, d_size_t, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.size_t, 1,                           
                   sfvalue_size_t(d_size_t));                                   
    }                                                                           
}

export function sfo_time_t(nhfp, d_time_t, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.time_t, 1, sfvalue_time_t(d_time_t));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_time_t(nhfp, d_time_t, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_time_t(nhfp, d_time_t, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_time_t(nhfp, d_time_t, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_time_t(nhfp, d_time_t, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_time_t(nhfp, d_time_t, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_time_t(nhfp.nhfpconvert, d_time_t, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.time_t, 1,                           
                   sfvalue_time_t(d_time_t));                                   
    }                                                                           
}

export function sfo_uchar(nhfp, d_uchar, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.uchar, 1, sfvalue_uchar(d_uchar));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_uchar(nhfp, d_uchar, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_uchar(nhfp, d_uchar, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_uchar(nhfp, d_uchar, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_uchar(nhfp, d_uchar, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_uchar(nhfp, d_uchar, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_uchar(nhfp.nhfpconvert, d_uchar, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.uchar, 1,                           
                   sfvalue_uchar(d_uchar));                                   
    }                                                                           
}

export function sfo_uint16(nhfp, d_uint16, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.uint16, 1, sfvalue_uint16(d_uint16));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_uint16(nhfp, d_uint16, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_uint16(nhfp, d_uint16, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_uint16(nhfp, d_uint16, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_uint16(nhfp, d_uint16, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_uint16(nhfp, d_uint16, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_uint16(nhfp.nhfpconvert, d_uint16, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.uint16, 1,                           
                   sfvalue_uint16(d_uint16));                                   
    }                                                                           
}

export function sfo_uint32(nhfp, d_uint32, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.uint32, 1, sfvalue_uint32(d_uint32));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_uint32(nhfp, d_uint32, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_uint32(nhfp, d_uint32, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_uint32(nhfp, d_uint32, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_uint32(nhfp, d_uint32, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_uint32(nhfp, d_uint32, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_uint32(nhfp.nhfpconvert, d_uint32, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.uint32, 1,                           
                   sfvalue_uint32(d_uint32));                                   
    }                                                                           
}

export function sfo_uint64(nhfp, d_uint64, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.uint64, 1, sfvalue_uint64(d_uint64));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_uint64(nhfp, d_uint64, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_uint64(nhfp, d_uint64, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_uint64(nhfp, d_uint64, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_uint64(nhfp, d_uint64, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_uint64(nhfp, d_uint64, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_uint64(nhfp.nhfpconvert, d_uint64, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.uint64, 1,                           
                   sfvalue_uint64(d_uint64));                                   
    }                                                                           
}

export function sfo_ulong(nhfp, d_ulong, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.ulong, 1, sfvalue_ulong(d_ulong));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_ulong(nhfp, d_ulong, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_ulong(nhfp, d_ulong, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_ulong(nhfp, d_ulong, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_ulong(nhfp, d_ulong, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_ulong(nhfp, d_ulong, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_ulong(nhfp.nhfpconvert, d_ulong, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.ulong, 1,                           
                   sfvalue_ulong(d_ulong));                                   
    }                                                                           
}

export function sfo_unsigned(nhfp, d_unsigned, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.unsigned, 1, sfvalue_unsigned(d_unsigned));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_unsigned(nhfp, d_unsigned, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_unsigned(nhfp, d_unsigned, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_unsigned(nhfp, d_unsigned, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_unsigned(nhfp, d_unsigned, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_unsigned(nhfp, d_unsigned, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_unsigned(nhfp.nhfpconvert, d_unsigned, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.unsigned, 1,                           
                   sfvalue_unsigned(d_unsigned));                                   
    }                                                                           
}

export function sfo_ushort(nhfp, d_ushort, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.ushort, 1, sfvalue_ushort(d_ushort));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_ushort(nhfp, d_ushort, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_ushort(nhfp, d_ushort, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_ushort(nhfp, d_ushort, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_ushort(nhfp, d_ushort, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_ushort(nhfp, d_ushort, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_ushort(nhfp.nhfpconvert, d_ushort, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.ushort, 1,                           
                   sfvalue_ushort(d_ushort));                                   
    }                                                                           
}

export function sfo_xint16(nhfp, d_xint16, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.xint16, 1, sfvalue_xint16(d_xint16));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_xint16(nhfp, d_xint16, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_xint16(nhfp, d_xint16, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_xint16(nhfp, d_xint16, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_xint16(nhfp, d_xint16, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_xint16(nhfp, d_xint16, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_xint16(nhfp.nhfpconvert, d_xint16, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.xint16, 1,                           
                   sfvalue_xint16(d_xint16));                                   
    }                                                                           
}

export function sfo_xint8(nhfp, d_xint8, myname)
{                                                                               
    if (nhfp.fplog)                                                            
        sf_log(nhfp, myname, C.sizes.xint8, 1, sfvalue_xint8(d_xint8));    
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_xint8(nhfp, d_xint8, myname);          
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_xint8(nhfp, d_xint8, myname);      
        nhfp.fplog = save_fplog;                                               
    }                                                                           
}                                                                               
                                                                                
export function sfi_xint8(nhfp, d_xint8, myname)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_xint8(nhfp, d_xint8, myname);          
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_xint8(nhfp, d_xint8, myname);      
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0)) && nhfp.nhfpconvert)  {     
            sfo_xint8(nhfp.nhfpconvert, d_xint8, myname);                    
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.xint8, 1,                           
                   sfvalue_xint8(d_xint8));                                   
    }                                                                           
}

/* SF_C && SF_A */

export function sfo_bitfield(nhfp, d_bitfield, myname, bfsz)
{                                                                               
    if (nhfp.fplog)                                                            
            sf_log(nhfp, myname, C.sizes.bitfield, 1,                           
                   sfvalue_bitfield(d_bitfield));                                   
    if (nhfp.structlevel) {                                                    
        C.sfoprocs[nhfp.fnidx].fn.sf_bitfield(nhfp, d_bitfield, myname, bfsz);    
    } else {                                                                    
        let save_fplog = nhfp.fplog;                                         
                                                                                
        nhfp.fplog = 0;                                                        
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_bitfield(nhfp, d_bitfield,               
                                                  myname, bfsz);                
        nhfp.fplog = save_fplog;                                               
    }                                                                           
    if (nhfp.fplog && !nhfp.eof)                                              
        sf_log(nhfp, myname, C.sizes.bitfield, 1, sfvalue_bitfield(d_bitfield));    
}                                                                               
                                                                                
export function sfi_bitfield(nhfp, d_bitfield, myname, bfsz)
{                                                                               
    if (nhfp.structlevel) {                                                    
        C.sfiprocs[nhfp.fnidx].fn.sf_bitfield(nhfp, d_bitfield, myname, bfsz);    
    } else {                                                                    
        let save_mode = nhfp.mode;                                             
                                                                                
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);                             
        nhfp.mode |= C.TURN_OFF_LOGGING;                                         
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_bitfield(nhfp, d_bitfield,               
                                                  myname, bfsz);                
        nhfp.mode = save_mode;                                                 
    }                                                                           
    if (!nhfp.eof) {                                                           
        if ((((nhfp.mode & C.CONVERTING) != 0)                                   
            || ((nhfp.mode & C.UNCONVERTING) != 0))                              
                       && nhfp.nhfpconvert) {                                  
            sfo_bitfield(nhfp.nhfpconvert, d_bitfield, myname, bfsz);              
        }                                                                       
        if (nhfp.fplog)                                                        
            sf_log(nhfp, myname, C.sizes.bitfield, 1,                           
                   bitfield_dump(d_bitfield));                                      
    }                                                                           
}

export function sfo_char(nhfp, d_char, myname, cnt)
{
    if (nhfp.fplog)
        sf_log(nhfp, myname, C.sizes.char, cnt, sfvalue_char(d_char, cnt));
    if (nhfp.structlevel) {
        C.sfoprocs[nhfp.fnidx].fn.sf_char(nhfp, d_char, myname, cnt);
    } else {
        let save_fplog = nhfp.fplog;

        nhfp.fplog = 0;
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_char(nhfp, d_char, myname, cnt);
        nhfp.fplog = save_fplog;
    }
}

export function sfi_char(nhfp, d_char, myname, cnt)
{
    if (nhfp.structlevel) {
        C.sfiprocs[nhfp.fnidx].fn.sf_char(nhfp, d_char, myname, cnt);
    } else {
        let save_mode = nhfp.mode;

        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);
        nhfp.mode |= C.TURN_OFF_LOGGING;
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_char(nhfp, d_char, myname, cnt);
        nhfp.mode = save_mode;
    }
    if (!nhfp.eof) {
        if ((((nhfp.mode & C.CONVERTING) != 0)
             || ((nhfp.mode & C.UNCONVERTING) != 0))
            && nhfp.nhfpconvert) {
            sfo_char(nhfp.nhfpconvert, d_char, myname, cnt);
        }
        if (nhfp.fplog)
            sf_log(nhfp, myname, C.sizes.char, cnt,
                   sfvalue_char(d_char, cnt));
    }
}

export function sfo_genericptr(nhfp, d_genericptr, myname)
{
    if (nhfp.fplog)
        sf_log(nhfp, myname, C.sizes.genericptr, 1,
               sfvalue_genericptr(d_genericptr));
    if (nhfp.structlevel) {
        C.sfoprocs[nhfp.fnidx].fn.sf_genericptr(nhfp, d_genericptr, myname);
    } else {
        let save_fplog = nhfp.fplog;
        nhfp.fplog = 0;
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_genericptr(nhfp, d_genericptr,
                                                    myname);
        nhfp.fplog = save_fplog;
    }
}
export function sfi_genericptr(nhfp, d_genericptr, myname)
{
    if (nhfp.structlevel) {
        C.sfiprocs[nhfp.fnidx].fn.sf_genericptr(nhfp, d_genericptr, myname);
    } else {
        let save_mode = nhfp.mode;
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);
        nhfp.mode |= C.TURN_OFF_LOGGING;
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_genericptr(nhfp, d_genericptr,
                                                    myname);
        nhfp.mode = save_mode;
    }
    if (!nhfp.eof) {
        if ((((nhfp.mode & C.CONVERTING) != 0) || ((nhfp.mode & C.UNCONVERTING) != 0))
            && nhfp.nhfpconvert) {
            sfo_genericptr(nhfp.nhfpconvert, d_genericptr, myname);
        }
        if (nhfp.fplog)
            sf_log(nhfp, myname, C.sizes.genericptr, 1,
                   sfvalue_genericptr(d_genericptr));
    }
}

export function sfo_version_info(nhfp, d_version_info, myname)
{
    if (nhfp.fplog)
        sf_log(nhfp, myname, C.sizes.version_info, 1,
               complex_dump(C.address(d_version_info)));
    if (nhfp.structlevel) {
        C.sfoprocs[nhfp.fnidx].fn.sf_version_info(nhfp, d_version_info,
                                                    myname);
    } else {
        let save_fplog = nhfp.fplog;
        nhfp.fplog = 0;
        C.sfoflprocs[nhfp.fnidx].fn_x.sf_version_info(nhfp, d_version_info,
                                                      myname);
        nhfp.fplog = save_fplog;
    }
}
export function sfi_version_info(nhfp, d_version_info, myname)
{
    if (nhfp.structlevel) {
        C.sfiprocs[nhfp.fnidx].fn.sf_version_info(nhfp, d_version_info,
                                                    myname);
    } else {
        let save_mode = nhfp.mode;
        nhfp.mode &= ~(C.CONVERTING | C.UNCONVERTING);
        nhfp.mode |= C.TURN_OFF_LOGGING;
        C.sfiflprocs[nhfp.fnidx].fn_x.sf_version_info(nhfp, d_version_info,
                                                      myname);
        nhfp.mode = save_mode;
    }
    if (!nhfp.eof) {
        if ((((nhfp.mode & C.CONVERTING) != 0) || ((nhfp.mode & C.UNCONVERTING) != 0))
            && nhfp.nhfpconvert) {
            d_version_info.feature_set |= BigInt(C.SFCTOOL_BIT);
            sfo_version_info(nhfp.nhfpconvert, d_version_info, myname);
        }
        if (nhfp.fplog)
            sf_log(nhfp, myname, C.sizes.version_info, 1,
                   complex_dump(C.address(d_version_info)));
    }
}

/* ---------------------------------------------------------------*/

export function sf_log(nhfp, t1, sz, cnt, txtvalue)
{
    let fp = nhfp.fplog;
    let iocount;
    let dolog = ((nhfp.mode & C.TURN_OFF_LOGGING) == 0);

    if (fp && dolog) {
        iocount = ((nhfp.mode & C.WRITING) == 0) ? C.addressOf(nhfp, "rcount") : C.addressOf(nhfp, "wcount");
        C.fprintf(fp,
                       "%08ld %s sz=%zu cnt=%d |%s|\n",

                       C.load("long", iocount),
                       t1,
                       sz,

                       cnt, txtvalue);
//        (*iocount)++;
//        if (*iocount == 87)
//            __debugbreak();
        C.fflush(fp);
    }
}

export function sfvalue_char(a, n)
{
    let i;
    const buf = C.buffers.sfvalue_char;
    let cp;

    cp = buf;
    if (n < (C.bufferSizes.sfvalue_char - 1))
        C.storeChar(buf + n, 0);
    else
        C.storeChar(buf + C.bufferSizes.sfvalue_char - 1, 0);
    for (i = 0; i < n; ++i, ++cp, ++a)
        C.storeChar(cp, C.load("char", a));
    C.storeChar(cp, 0);
    return buf;
}

export function sfvalue_boolean(a)
{
    const buf = C.buffers.sfvalue_boolean;

    C.Snprintf(buf, C.bufferSizes.sfvalue_boolean, "%s",
             (C.load("boolean", a) == 0) ? "false" : "true", 0);
    return buf;
}

export function sfvalue_schar(a)
{
    const buf = C.buffers.sfvalue_schar;

    C.Snprintf(buf, C.bufferSizes.sfvalue_schar, "%d", C.load("schar", a), 1);
    return buf;
}

export function sfvalue_aligntyp(a)
{
    const buf = C.buffers.sfvalue_aligntyp;

    C.Snprintf(buf, C.bufferSizes.sfvalue_aligntyp, "%d", C.load("aligntyp", a), 2);
    return buf;
}

export function sfvalue_any(a)
{
    const buf = C.buffers.sfvalue_any;

    C.Snprintf(buf, C.bufferSizes.sfvalue_any,
             "%" + C.PRId64,
             C.load("int64", a), 3);
    return buf;
}

export function sfvalue_genericptr(a)
{
    const buf = C.buffers.sfvalue_genericptr;

    C.Snprintf(buf, C.bufferSizes.sfvalue_genericptr, "%s", 
             (a == 0) ? "0" : "glorkum", 4);
    return buf;
}

export function sfvalue_int16(a)
{
    const buf = C.buffers.sfvalue_int16;

    C.Snprintf(buf, C.bufferSizes.sfvalue_int16, "%d", C.load("int16", a), 5);
    return buf;
}

export function sfvalue_int32(a)
{
    const buf = C.buffers.sfvalue_int32;

    C.Snprintf(buf, C.bufferSizes.sfvalue_int32, "%" + C.PRId32, C.load("int32", a), 6);
    return buf;
}

export function sfvalue_int64(a)
{
    const buf = C.buffers.sfvalue_int64;
    C.Snprintf(buf, C.bufferSizes.sfvalue_int64, "%" + C.PRId64, C.load("int64", a), 7);
    return buf;
}

export function sfvalue_uchar(a)
{
    const buf = C.buffers.sfvalue_uchar;
    let x;

    x = C.load("uchar", a);
    C.Snprintf(buf, C.bufferSizes.sfvalue_uchar, "%03u", x, 8);
    return buf;
}

export function sfvalue_uint16(a)
{
    const buf = C.buffers.sfvalue_uint16;

    C.Snprintf(buf, C.bufferSizes.sfvalue_uint16, "%u", C.load("uint16", a), 9);
    return buf;
}

export function sfvalue_uint32(a)
{
    const buf = C.buffers.sfvalue_uint32;

    C.Snprintf(buf, C.bufferSizes.sfvalue_uint32, "%" + C.PRIu32, C.load("uint32", a), 10);
    return buf;
}

export function sfvalue_uint64(a)
{
    const buf = C.buffers.sfvalue_uint64;

    C.Snprintf(buf, C.bufferSizes.sfvalue_uint64, "%" + C.PRIu64, C.load("uint64", a), 11);
    return buf;
}

export function sfvalue_size_t(a)
{
    const buf = C.buffers.sfvalue_size_t;

    C.Snprintf(buf, C.bufferSizes.sfvalue_size_t, "%s", "", 12);
    return buf;
}

export function sfvalue_time_t(a)
{
    const buf = C.buffers.sfvalue_time_t;

    C.Snprintf(buf, C.bufferSizes.sfvalue_time_t, "%s", "", 13);
    return buf;
}

export function sfvalue_short(a)
{
    const buf = C.buffers.sfvalue_short;

    C.Snprintf(buf, C.bufferSizes.sfvalue_short, "%d", C.load("short", a), 14);
    return buf;
}

export function sfvalue_ushort(a)
{
    const buf = C.buffers.sfvalue_ushort;

    C.Snprintf(buf, C.bufferSizes.sfvalue_ushort, "%u", C.load("ushort", a), 15);
    return buf;
}

export function sfvalue_int(a)
{
    const buf = C.buffers.sfvalue_int;

    C.Snprintf(buf, C.bufferSizes.sfvalue_int, "%d", C.load("int", a), 16);
    return buf;
}

export function sfvalue_unsigned(a)
{
    const buf = C.buffers.sfvalue_unsigned;

    C.Snprintf(buf, C.bufferSizes.sfvalue_unsigned, "%u", C.load("unsigned", a), 17);
    return buf;
}

export function sfvalue_long(a)
{
    const buf = C.buffers.sfvalue_long;

    C.Snprintf(buf, C.bufferSizes.sfvalue_long, "%ld", C.load("long", a), 18);
    return buf;
}

export function sfvalue_ulong(a)
{
    const buf = C.buffers.sfvalue_ulong;

    C.Snprintf(buf, C.bufferSizes.sfvalue_ulong, "%lu", C.load("ulong", a), 19);
    return buf;
}

export function sfvalue_xint8(a)
{
    const buf = C.buffers.sfvalue_xint8;

    C.Snprintf(buf, C.bufferSizes.sfvalue_xint8, "%d", C.load("xint8", a), 20);
    return buf;
}

export function sfvalue_xint16(a)
{
    const buf = C.buffers.sfvalue_xint16;


    C.Snprintf(buf, C.bufferSizes.sfvalue_xint16, "%d", C.load("xint16", a), 21);
    return buf;
}

export function sfvalue_bitfield(a)
{
    const buf = C.buffers.sfvalue_bitfield;

    C.Snprintf(buf, C.bufferSizes.sfvalue_bitfield, "%u", C.load("uint8", a), 22);
    return buf;
}

export function bitfield_dump(a)
{
    const buf = C.buffers.bitfield_dump;

    C.Snprintf(buf, C.bufferSizes.bitfield_dump, "%u", C.load("uint8", a), 23);
    return buf;
}
export function complex_dump(a)
{
    let i;
    let uc = a;
    const buf = C.buffers.complex_dump;
    const x = C.unsignedArray(10);

    for (i = 0; i < x.length; ++i) {
        x[i] = C.load("uchar", uc++);
    }
    C.Snprintf(buf, C.bufferSizes.complex_dump, "%03x %03x %03x %03x %03x %03x %03x %03x %03x %03x", 
             x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8], x[9], 24);
    C.storeChar(buf + 40, 0);
    return buf;
}
/*
 *----------------------------------------------------------------------------
 * initialize the function pointers. These are called from initoptions_init().
 *----------------------------------------------------------------------------
 */

export function sf_init()
{
    C.sfoprocs[C.invalid] = C.zerosfoprocs;
    C.sfiprocs[C.invalid] = C.zerosfiprocs;
    C.sfoprocs[C.historical] = C.historical_sfo_procs;
    C.sfiprocs[C.historical] = C.historical_sfi_procs;
    C.sfoflprocs[C.exportascii] = C.zerosfoflprocs;
    C.sfiflprocs[C.exportascii] = C.zerosfiflprocs;
}

export function sf_setprocs(idx, sfi, sfo)
{
    C.sfoprocs[idx] = C.structlevel(sfo);
    C.sfiprocs[idx] = C.structlevel(sfi);
}
export function sf_setflprocs(idx, flsfi, flsfo)
{
    C.sfoflprocs[idx] = C.fieldlevel(flsfo);
    C.sfiflprocs[idx] = C.fieldlevel(flsfi);
}


export function norm_ptrs_any(d_any)
{
}
export function norm_ptrs_align(d_align)
{
}

export function norm_ptrs_arti_info(d_arti_info)
{
}

export function norm_ptrs_attribs(d_attribs)
{
}

export function norm_ptrs_bill_x(d_bill_x)
{
}

export function norm_ptrs_branch(d_branch)
{
}

export function norm_ptrs_bubble(d_bubble)
{
}

export function norm_ptrs_cemetery(d_cemetery)
{
}

export function norm_ptrs_context_info(d_context_info)
{
}

export function norm_ptrs_achievement_tracking(d_achievement_tracking)
{
}

export function norm_ptrs_book_info(d_book_info)
{
}

export function norm_ptrs_dig_info(d_dig_info)
{
}

export function norm_ptrs_engrave_info(d_engrave_info)
{
}

export function norm_ptrs_obj_split(d_obj_split)
{
}

export function norm_ptrs_polearm_info(d_polearm_info)
{
}

export function norm_ptrs_takeoff_info(d_takeoff_info)
{
}

export function norm_ptrs_tin_info(d_tin_info)
{
}

export function norm_ptrs_tribute_info(d_tribute_info)
{
}

export function norm_ptrs_victual_info(d_victual_info)
{
}

export function norm_ptrs_warntype_info(d_warntype_info)
{
}

export function norm_ptrs_d_flags(d_d_flags)
{
}

export function norm_ptrs_d_level(d_d_level)
{
}

export function norm_ptrs_damage(d_damage)
{
}

export function norm_ptrs_dest_area(d_dest_area)
{
}

export function norm_ptrs_dgn_topology(d_dgn_topology)
{
}

export function norm_ptrs_dungeon(d_dungeon)
{
}

export function norm_ptrs_ebones(d_ebones)
{
}

export function norm_ptrs_edog(d_edog)
{
}

export function norm_ptrs_egd(d_egd)
{
}

export function norm_ptrs_emin(d_emin)
{
}

export function norm_ptrs_engr(d_engr)
{
}

export function norm_ptrs_epri(d_epri)
{
}

export function norm_ptrs_eshk(d_eshk)
{
}

export function norm_ptrs_fakecorridor(d_fakecorridor)
{
}

export function norm_ptrs_fe(d_fe)
{
}

export function norm_ptrs_flag(d_flag)
{
}

export function norm_ptrs_fruit(d_fruit)
{
}

export function norm_ptrs_gamelog_line(d_gamelog_line)
{
}

export function norm_ptrs_kinfo(d_kinfo)
{
}

export function norm_ptrs_levelflags(d_levelflags)
{
}

export function norm_ptrs_linfo(d_linfo)
{
}

export function norm_ptrs_ls_t(d_ls_t)
{
}

export function norm_ptrs_mapseen_feat(d_mapseen_feat)
{
}

export function norm_ptrs_mapseen_flags(d_mapseen_flags)
{
}

export function norm_ptrs_mapseen_rooms(d_mapseen_rooms)
{
}

export function norm_ptrs_mapseen(d_mapseen)
{
}

export function norm_ptrs_mextra(d_mextra)
{
}

export function norm_ptrs_mkroom(d_mkroom)
{
}

export function norm_ptrs_monst(d_monst)
{
}

export function norm_ptrs_mvitals(d_mvitals)
{
}

export function norm_ptrs_nhcoord(d_nhcoord)
{
}

export function norm_ptrs_nhrect(d_nhrect)
{
}

export function norm_ptrs_novel_tracking(d_novel_tracking)
{
}

export function norm_ptrs_obj(d_obj)
{
}

export function norm_ptrs_objclass(d_objclass)
{
}

export function norm_ptrs_oextra(d_oextra)
{
}

export function norm_ptrs_prop(d_prop)
{
}

export function norm_ptrs_q_score(d_q_score)
{
}

export function norm_ptrs_rm(d_rm)
{
}

export function norm_ptrs_s_level(d_s_level)
{
}

export function norm_ptrs_skills(d_skills)
{
}

export function norm_ptrs_spell(d_spell)
{
}

export function norm_ptrs_stairway(d_stairway)
{
}

export function norm_ptrs_trap(d_trap)
{
}

export function norm_ptrs_u_conduct(d_u_conduct)
{
}

export function norm_ptrs_u_event(d_u_event)
{
}

export function norm_ptrs_u_have(d_u_have)
{
}

export function norm_ptrs_u_realtime(d_u_realtime)
{
}

export function norm_ptrs_u_roleplay(d_u_roleplay)
{
}

export function norm_ptrs_version_info(d_version_info)
{
}

export function norm_ptrs_vlaunchinfo(d_vlaunchinfo)
{
}

export function norm_ptrs_vptrs(d_vptrs)
{
}

export function norm_ptrs_you(d_you)
{
}


/* SFCTOOL */

/* end of sfbase.c */

