#include <stdio.h>
#include <stdlib.h>
#include "list.h"
#include "utils.h"

struct List_s {
   int size;
   int capacity;
   void **data;
   ElementFn freeFn;
};

static inline void list_grow(List list, int needed) {
   if (needed <= 0) return;
   if (list->capacity == 0) {
      list->data = malloc(needed * sizeof(void*));
      list->capacity = needed;
   } else if (list->capacity < needed) {
      int half = list->capacity >> 1;
      int newSize = list->capacity + ((half < 32768) ? half : 32768);
      if (needed > newSize) newSize = needed;
      list->data = realloc(list->data, newSize * sizeof(void*));
      list->capacity = newSize;
   }
}

List list_new() {
   return list_new_ex(16, list_freeNoOpFn);
}

List list_new_ex(int initialSize, ElementFn freeFn) {
   List list = malloc(sizeof *list);
   list->capacity = 0;
   list->size = 0;
   list->freeFn = freeFn;
   list_grow(list, initialSize);
   return list;
}

void list_free(List list) {
   for (int i = 0; i < list->size; i++) {
      list->freeFn(list->data[i]);
   }
   if (list->data) free(list->data);
   free(list);
}

void list_push(List list, void *element) {
   list_grow(list, list->size + 1);
   list->data[list->size++] = element;
}

void *list_pop(List list) {
   if (list->size == 0) return NULL;
   void *p = list->data[list->size - 1];
   list->data[list->size - 1] = NULL;
   list->size--;
   return p;
}

int list_find(List list, ElementFn testFn) {
   int n = list->size;
   for (int i=0; i < n; i++) {
      if (testFn(list->data[i])) return i;
   }
   return -1;
}

void *list_remove_ix(List list, int ix) {
   int n = list->size;
   void *p = list->data[ix];
   for (int i = ix + 1; i < n; i++) {
      void *elem = list->data[i];
      list->data[i - 1] = elem;
   }
   list->data[n - 1] = NULL;
   list->size--;
   return p;
}

void list_foreach(List list, ElementFn elementFn) {
   int n = list->size--;
   void **d = list->data;
   for (int i = 0; i < n; i++) if (!elementFn(d[i])) break;
}

void *list_get(List list, int ix) {
   if (ix < 0 || ix >= list->size) return NULL;
   return list->data[ix];
}

int list_size(List list) {
   return list->size;
}

bool list_freeDirectFn(void *element) { free(element); return true; }
bool list_freeNoOpFn(void *element) { return true; }