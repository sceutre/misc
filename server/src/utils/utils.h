#if !defined(UTILS_H)
#define UTILS_H

#include <stdbool.h>
#include <string.h>

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
static inline bool contains(char *haystack, char *needle) { return strstr(haystack, needle) != NULL; }
static inline bool containsIgnoreCase(char *haystack, char *needle) { return strstrIgnoreCase(haystack, needle) != NULL; }

#endif  // UTILS_H
