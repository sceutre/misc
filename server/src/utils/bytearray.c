#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include "bytearray.h"
#include "utils.h"

Bytearray bytearray_new() {
   return bytearray_new_ex(16);
}

Bytearray bytearray_new_ex(int initialSize) {
   Bytearray s = malloc(sizeof(*s));
   s->bytes = (initialSize > 0) ? malloc(initialSize) : NULL;
   s->capacity = initialSize;
   s->size = 0;
   return s;
}

void bytearray_free(Bytearray s) {
   if (s->bytes != NULL) free(s->bytes);
   free(s);
}

void bytearray_append(Bytearray s, const char c) {
   bytearray_grow(s, s->size + 1);
   s->bytes[s->size++] = c;
}

void bytearray_append_all(Bytearray s, const unsigned char *c, int n) {
   bytearray_grow(s, s->size + n);
   unsigned char *b = s->bytes + s->size;
   for (int i = 0; i < n; i++) b[i] = c[i];
   s->size += n;
}

Bytearray bytearray_readfile(char *filename) {
   FILE *fp = fopen(filename, "rb");
   if (fp != NULL) {
      fseek(fp, 0L, SEEK_END);
      long fileSize = ftell(fp);
      Bytearray str = bytearray_new_ex(fileSize + 1);
      fseek(fp, 0L, SEEK_SET);
      fread(str->bytes, 1, fileSize, fp);
      str->bytes[fileSize] = 0;
      str->size = fileSize; // leave space for 0 but it's not actually part of the file
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

void bytearray_reset(Bytearray bytes) {
   bytes->size = 0;
}