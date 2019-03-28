#ifndef BUFFER_H_
#define BUFFER_H_

#include "headers.h"

#define sb_free(a) ((a) ? free(stb__sbraw(a)), 0 : 0)

// push items on to array
#define sb_push(a, v) (stb__sbmaybegrow(a, 1), (a)[stb__sbn(a)++] = (v))
#define sb_push_all(a, b, n)                           \
   do {                                                \
      int _ii = 0;                                     \
      stb__sbmaybegrow(a, n);                          \
      while (_ii < n) (a)[stb__sbn(a)++] = (b[_ii++]); \
   } while (0)

// push items on to array, maintaining a terminating 0
#define sb_append(a, v) ((a) ? 1 : sb_push(a, 0), stb__sbmaybegrow(a, 1), (a)[stb__sbn(a)++] = 0, (a)[stb__sbn(a) - 2] = (v))
#define sb_append_all(a, b)                                                   \
   do {                                                                       \
      int _ii = 0, _n = strlen(b);                                            \
      a ? stb__sbmaybegrow(a, _n) : (sb_push(a, 0), stb__sbmaybegrow(a, _n)); \
      while (_ii < _n) (a)[stb__sbn(a)++ - 1] = (b[_ii++]);                   \
      (a)[stb__sbn(a) - 1] = 0;                                               \
   } while (0)

// removes an item, returns item or 0 if already empty
#define sb_pop(a) ((a) && (stb__sbn(a) > 0) ? (a)[--stb__sbn(a)] : 0)

// count of items
#define sb_count(a) ((a) ? stb__sbn(a) : 0)

// grow capacitiy to handle n items if needed
#define sb_grow(a, n) stb__sbmaybegrow(a, n)

// returns last item or 0 if empty
#define sb_last(a) ((a) ? (a)[stb__sbn(a) - 1] : 0)

// resets the count of the array, leaving malloc'd capacity untouched
#define sb_reset(a) ((a) ? stb__sbn(a) = 0 : 0)

// private - convert array to an int* pointer and set at actual start of malloced mem
#define stb__sbraw(a) ((int *)(a)-2)

// private - read first int (capacity), and second int (size)
#define stb__sbm(a) stb__sbraw(a)[0]
#define stb__sbn(a) stb__sbraw(a)[1]

// private - check to see if we need to grow
#define stb__sbneedgrow(a, n) ((a) == 0 || stb__sbn(a) + (n) >= stb__sbm(a))
#define stb__sbmaybegrow(a, n) (stb__sbneedgrow(a, (n)) ? stb__sbgrow(a, n) : 0)
#define stb__sbgrow(a, n) (*((void **)&(a)) = stb__sbgrowf((a), (n), sizeof(*(a))))
void *stb__sbgrowf(void *arr, int increment, int itemsize);

// reads a file into an array, it will push to the end of the array but does not maintain a terminating 0
#define sb_read_file(a, filename) (*((void **)&(a)) = stb__read_file(a, filename))
void *stb__read_file(char *arr, char *filename);

// write a file, note uses sb_count and ignores terminating 0s
void sb_write_file(char *buf, char *filename);

#endif /* BUFFER_H_ */
