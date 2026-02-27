typedef int boolean;

extern void nh_delay_output(void);
extern void tmp_at(int mode, int x);

void delay_once(void)
{
    nh_delay_output();
}

void delay_or_mark(boolean do_delay)
{
    if (do_delay) {
        nh_delay_output();
    }
    tmp_at(1, 2);
}

void mark_only(void)
{
    tmp_at(1, 2);
}

void calls_delay_once(void)
{
    delay_once();
}
