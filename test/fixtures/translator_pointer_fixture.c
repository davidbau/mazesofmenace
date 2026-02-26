struct foo_t {
    int bar;
};
typedef int (*unary_fn_t)(int);

#ifndef TRUE
#define TRUE 1
#endif
#ifndef FALSE
#define FALSE 0
#endif

int
ptr_read(struct foo_t *f)
{
    int x = f->bar;
    if (x > 7L)
        x = 7L;
    return x;
}

int
bool_flip(int x)
{
    if (x)
        return TRUE;
    return FALSE;
}

int
call_fn(unary_fn_t fn, int x)
{
    return (*fn)(x);
}

int
array_sum(void)
{
    int vals[] = { 1, 2, 3 };
    return vals[0] + vals[1] + vals[2];
}

int
address_of_member(struct foo_t *f)
{
    if (f == NULL)
        return 0;
    return (&f->bar != NULL);
}
