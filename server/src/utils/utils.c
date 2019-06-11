#include <stdio.h>
#include "utils.h"

char *strstrIgnoreCase(char *haystack, char *needle) {
   while (true) {
      const char *h = haystack;
      const char *n = needle;
      while (tolower((unsigned char)*h) == tolower((unsigned char)*n) && *n) {
         h++;
         n++;
      }
      if (*n == 0) return (char *)haystack;
      if (*haystack++ == 0) return NULL;
   }
}

char *trim(char *string) {
   while (isspace(*string)) string++;
   int i = 0;
   int j = -1;
   while (true) {
      char c = string[i++];
      if (c == 0) break;
      if (isspace(c)) {
         if (j < 0) j = i;
      } else {
         j = -1;
      }
   }
   if (j >= 0) string[j] = 0;
   return string;
}

unsigned long hashInt(unsigned long x) {
   x = ((x >> 16) ^ x) * 0x45d9f3b;
   x = ((x >> 16) ^ x) * 0x45d9f3b;
   x = (x >> 16) ^ x;
   return x;
}

unsigned long hashString(char *sstr) {
   unsigned char *str = (unsigned char *)sstr;
   unsigned long hash = 5381;
   int c;
   while ((c = *str++) != 0) hash = ((hash << 5) + hash) + c; /* hash * 33 + c */
   return hash;
}

void replaceChar(char *text, char find, char replace) {
   char c;
   while ((c = *text++)) {
      if (c == find) *(text - 1) = replace;
   }
}

void maskString(char *text, char *toFind, char mask) {
   int n = strlen(toFind);
   while (true) {
      text = strstr(text, toFind);
      if (text == NULL) return;
      for (int i = 0; i < n; i++) *text++ = mask;
   }
}

void lowercase(char *src, char *dest, int n) {
   for (int i = 0; i < n; i++) {
      dest[i] = tolower(src[i]);
      if (src[i] == 0) return;
   }
}

int toInt(char *str) {
   char *end;
   long res = strtol(str, &end, 10);
   if (end == str || *end != 0) throw(t_printf("not completely numeric: <%s>", str));
   return res;
}

void stringCopyUpTo(char *dest, const char *src, char stopChar, int max) {
   for (int i = 0; i < max; i++) {
      if (src[i] == 0 || src[i] == stopChar) {
         dest[i] = 0;
         return;
      }
      dest[i] = src[i];
   }
}

int findAll(char *haystack, char c, int *array, int size) {
   int foundIx = 0;
   for (int i = 0; foundIx < size && haystack[i] != 0; i++) {
      if (haystack[i] == c) array[foundIx++] = i;
   }
   return foundIx;
}

