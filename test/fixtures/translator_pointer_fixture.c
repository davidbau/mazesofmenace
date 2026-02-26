struct foo_t {
    int bar;
};

int
ptr_read(struct foo_t *f)
{
    int x = f->bar;
    if (x > 7L)
        x = 7L;
    return x;
}
