#ifndef STRING_H
#define STRING_H

#include <stdlib.h>
#include "utils.h"

typedef struct BytearrayStruct {
   int size;
   int capacity;
   unsigned char *bytes;
   char growMode;
} *Bytearray;

Bytearray bytearray_new();
Bytearray bytearray_new_ex(int initialSize, char growMode);
Bytearray bytearray_readfile(char *filename);
void bytearray_append(Bytearray bytes, const char c);
void bytearray_append_all(Bytearray bytes, const unsigned char *str, int n);
void bytearray_writefile(Bytearray bytes, char *filename);
void bytearray_free(Bytearray bytes);
void bytearray_reset(Bytearray bytes);

static inline void bytearray_grow(Bytearray bytes, int needed) {
   if (needed <= 0) return;
   if (bytes->capacity == 0) {
      bytes->bytes = malloc(needed);
      bytes->capacity = needed;
   } else if (bytes->capacity < needed) {
      int newSize = growSize(bytes->capacity, needed, bytes->growMode);
      bytes->bytes = realloc(bytes->bytes, newSize);
      bytes->capacity = newSize;
   }
}
#endif