#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include "bytearray.h"
#include "utils.h"

Bytearray bytearray_new(int initialSize) {
   Bytearray s = malloc(sizeof(*s));
   s->bytes = initialSize == 0 ? NULL : malloc(initialSize);
   s->capacity = initialSize;
   s->size = 0;
   return s;
}

void bytearray_free(Bytearray s) {
   if (s->bytes != NULL) free(s->bytes);
   free(s);
}

void bytearray_append(Bytearray s, unsigned char c) {
   if (s->size == s->capacity) {
      int newSize = growSize(s->capacity, s->size + 1);
      s->bytes = realloc(s->bytes, newSize);
      s->capacity = newSize;
   }
   s->bytes[s->size++] = c;
}

void bytearray_append_all(Bytearray s, unsigned char *c, int n) {
   if (s->size == s->capacity) {
      int newSize = growSize(s->capacity, s->size + 1);
      s->bytes = realloc(s->bytes, newSize);
      s->capacity = newSize;
   }
   s->bytes[s->size++] = c;
}

Bytearray bytearray_readfile(char *filename) {
   FILE *fp = fopen(filename, "rb");
   if (fp != NULL) {
      fseek(fp, 0L, SEEK_END);
      long fileSize = ftell(fp);
      Bytearray str = bytearray_new(fileSize + 1);
      fseek(fp, 0L, SEEK_SET);
      fread(str->bytes, 1, fileSize, fp);
      str->bytes[fileSize] = 0;
      str->size = fileSize + 1;
      fclose(fp);
      return str;
   }
   return NULL;
}

void bytearray_writefile(Bytearray contents, char *filename) {
   FILE *fp = fopen(filename, "wb");
   fwrite(contents->bytes, 1, contents->size, fp);
   fclose(fp);
}
