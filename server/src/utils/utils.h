#if !defined(UTILS_H)
#define UTILS_H

#include "headers.h"
#include "buffer.h"
#include "log.h"
#include "queue.h"
#include "sockets.h"
#include "concurrency.h"
#include "map.h"

int min(int a, int b);
int max(int a, int b);
bool contains(char *haystack, char *needle);
bool containsIgnoreCase(char *haystack, char *needle);
char *strstrIgnoreCase(char *haystack, char *needle);
char *trim(char *string);
unsigned long hashInt(unsigned long x);
unsigned long hashString(char *str);
void replaceChar(char *text, char find, char replace);
void maskString(char *text, char *toFind, char mask);
void lowercase(char *src, char *dest, int n);
char **parseArgv(Map *options, char **argv, int argc);
int toInt(char *str);
void stringCopyUpTo(char *dest, const char *src, char stopChar, int max);

#endif  // UTILS_H
