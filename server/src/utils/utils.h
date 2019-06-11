#if !defined(UTILS_H)
#define UTILS_H

#include <stdbool.h>
#include <string.h>

#define GROW_MODE_16        1
#define GROW_MODE_MIN       2
#define GROW_MODE_HALFAGAIN 3

char *strstrIgnoreCase(char *haystack, char *needle);
char *trim(char *string);
unsigned long hashInt(unsigned long x);
unsigned long hashString(char *str);
void replaceChar(char *text, char find, char replace);
void maskString(char *text, char *toFind, char mask);
void lowercase(char *src, char *dest, int n);
int toInt(char *str);
void stringCopyUpTo(char *dest, const char *src, char stopChar, int max);
int findAll(char *haystack, char c, int *array, int size);

static inline int min(int a, int b) { return a < b ? a : b; }
static inline int max(int a, int b) { return a < b ? b : a; }

static inline int growSize(int capacity, int needed, int growMode) { 
   switch (growMode) {
      case GROW_MODE_16: return max(needed, capacity + 16);
      case GROW_MODE_MIN: return needed;
      case GROW_MODE_HALFAGAIN: 
      default:
         return max(needed, capacity + min(32768, capacity >> 1));
   }
}

static inline bool contains(char *haystack, char *needle) { return strstr(haystack, needle) != NULL; }
static inline bool containsIgnoreCase(char *haystack, char *needle) { return strstrIgnoreCase(haystack, needle) != NULL; }

#endif  // UTILS_H
