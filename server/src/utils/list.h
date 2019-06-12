#ifndef LIST_H
#define LIST_H

#include <stdlib.h>
#include <stdbool.h>
#include "utils.h"

typedef bool (*ElementFn)(void *element);

typedef struct ListStruct {
   int size;
   int capacity;
   void **data;
   ElementFn freeFn;
   char growMode;
} *List;

List list_new();
List list_new_ex(int initialSize, char growMode, ElementFn freeFn);
void list_push(List list, void *element);
void *list_pop(List list);
int list_find(List list, ElementFn testFn);
void *list_remove_ix(List list, int ix);
void list_free(List list);
void list_foreach(List list, ElementFn elementFn);

static inline void list_grow(List list, int needed) {
   if (needed <= 0) return;
   if (list->capacity == 0) {
      list->data = malloc(needed * sizeof(void*));
      list->capacity = needed;
   } else if (list->capacity < needed) {
      int newSize = growSize(list->capacity, needed, list->growMode);
      list->data = realloc(list->data, newSize * sizeof(void*));
      list->capacity = newSize;
   }
}

bool list_freeDirectFn(void *element);
bool list_freeNoOpFn(void *element);

#endif