#ifndef STRING_H
#define STRING_H

typedef struct {
   int size;
   int capacity;
   unsigned char *bytes;
} *Bytearray;

Bytearray bytearray_new(int initialSize);
Bytearray bytearray_readfile(char *filename);
void bytearray_append(Bytearray bytes, char c);
void bytearray_append_all(Bytearray bytes, unsigned char *str, int n);
void bytearray_writefile(Bytearray bytes, char *filename);
void bytearray_free(Bytearray bytes);

#endif