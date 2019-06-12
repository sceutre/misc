#ifndef LIST_H
#define LIST_H

#include <stdlib.h>
#include <stdbool.h>
#include "utils.h"

typedef bool (*ElementFn)(void *element);

typedef struct ListStruct {
   int size;
   int capacity;
   int sizeofElem;
   void *elements;
   void (*setFn)(struct ListStruct *list, void *element, int i);
   char growMode;
} *List;

typedef void (*SetElementFn)(List list, void *element, int i);

List list_new(int initialSize, int sizeofElement, SetElementFn setFn);
void list_push(List list, void *element);
void *list_pop(List list);
int list_find(List list, ElementFn testFn);
void list_remove_ix(List list, int ix);
void list_free(List list);
void list_foreach(List list, ElementFn elementFn);

static inline void *list_get(List list, int i) {
   return ((char *)list->elements) + i * list->sizeofElem;
}

static inline void list_grow(List list, int needed) {
   if (list->capacity == 0 && needed > 0) {
      list->elements = malloc(needed * list->sizeofElem);
      list->capacity = needed;
   } else if (list->capacity < needed) {
      int newSize = growSize(list->capacity, needed, list->growMode);
      list->elements = realloc(list->elements, newSize * list->sizeofElem);
      list->capacity = newSize;
   }
}

void list_setFnCStrings(List list, void *element, int i);

#endif