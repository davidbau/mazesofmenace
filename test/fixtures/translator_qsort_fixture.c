typedef void *genericptr_t;
typedef int (*qsort_cmp_t)(const void *, const void *);

extern void qsort(genericptr_t base, int nmemb, int size, qsort_cmp_t cmp);
extern int cond_cmp(const void *a, const void *b);
extern int menualpha_cmp(const void *a, const void *b);

int CONDITION_COUNT = 8;
int cond_idx[8];
int sequence[8];

void cond_sort_callsite(void) {
    qsort(cond_idx, CONDITION_COUNT, sizeof cond_idx[0], cond_cmp);
}

void menualpha_sort_callsite(void) {
    qsort(sequence, CONDITION_COUNT, sizeof(sequence[0]), menualpha_cmp);
}
