void Sprintf(char *dst, const char *fmt, ...);
void Snprintf(char *dst, int n, const char *fmt, ...);
void Strcpy(char *dst, const char *src);
void Strcat(char *dst, const char *src);
void Strncpy(char *dst, const char *src, int n);
char *eos(char *s);
int strcmpi(const char *a, const char *b);
int strncmpi(const char *a, const char *b, int n);
int atoi(const char *s);
int strlen(const char *s);
int abs(int x);

void
fmt_assign(char *buf, int st)
{
    Sprintf(buf, "18/%02d", st - 18);
}

void
fmt_append(char *buf, int x)
{
    Sprintf(eos(buf), "-%d", x);
}

void
fmt_bound(char *buf, int n, int x)
{
    Snprintf(buf, n, "%d", x);
}

void
str_ops(char *buf, const char *src)
{
    Strcpy(buf, src);
    Strcat(buf, "!");
    Strncpy(buf, src, 3);
}

int
conv_ops(const char *s, const char *a, const char *b, int x)
{
    return strlen(s) + atoi(s) + abs(x) + strcmpi(a, b) + strncmpi(a, b, 2);
}
