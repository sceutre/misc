#include "buffer.h"

#define SZ 32768

void *stb__sbgrowf(void *arr, int increment, int itemsize) {
   int capacity = arr ? stb__sbm(arr) : 0;
   int size = arr ? stb__sbn(arr) : 0;
   int newSize = size + increment;
   if (newSize <= capacity) return arr;
   int capacityMin = max(newSize, capacity + 32/itemsize);
   int capacity2x = arr ? (capacity + min(SZ,capacity)) : 0;
   int m = max(capacity2x, capacityMin);
   int *p = (int *)realloc(arr ? stb__sbraw(arr) : 0, itemsize * m + sizeof(int) * 2);
   if (p) {
      if (!arr) p[1] = 0;
      p[0] = m;
      return p + 2;
   } else {
      return (void *)(2 * sizeof(int));  // try to force a NULL pointer exception later
   }
}

void *stb__read_file(char *buf, char *filename) {
   FILE *fp = fopen(filename, "rb");
   if (fp != NULL) {
      fseek(fp, 0L, SEEK_END);
      long fileSize = ftell(fp);
      sb_grow(buf, fileSize + 1); // although this routine does not appead a terminating 0, grab space now so we don't need to realloc just for that
      fseek(fp, 0L, SEEK_SET);
      fread(buf, 1, fileSize, fp);
      stb__sbn(buf) += fileSize;
      fclose(fp);
   }
   return buf;
}

void sb_write_file(char *buf, char *filename) {
   FILE *fp = fopen(filename, "wb");
   fwrite(buf, 1, stb__sbn(buf), fp);
   fclose(fp);
}
