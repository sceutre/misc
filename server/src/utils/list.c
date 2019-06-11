#include <stdio.h>
#include <stdlib.h>
#include "list.h"
#include "utils.h"

static void basicFreeFn(void *elem) {
   free(elem);
}

List list_new(int initialSize, int sizeofElement, SetElementFn setFn) {
   List list = malloc(sizeof *list);
   list->capacity = 0;
   list->size = 0;
   list->growMode = GROW_MODE_HALFAGAIN;
   list->sizeofElem = sizeofElement;
   list->setFn = setFn;
   list_grow(list, initialSize);
   return list;
}

void list_free(List list) {
   if (list->elements) free(list->elements);
   free(list);
}

void list_push(List list, void *element) {
   list_grow(list, list->size + 1);
   list->setFn(list, element, list->size++);
}

void *list_pop(List list) {
   if (list->size == 0) return NULL;
   int n = --list->size;
   return list_get(list, n);
}

int list_find(List list, ElementFn testFn) {
   int n = list->size;
   int sz = list->sizeofElem;
   for (int i=0; i < n; i++) {
      if (testFn(list->elements + i*sz)) return i;;
   }
   return -1;
}

void list_remove_ix(List list, int ix) {
   int n = list->size--;
   int sz = list->sizeofElem;
   for (int i = ix + 1; i < n; i++) {
      void *elem = list->elements + i * sz;
      list->setFn(list, elem, i-1);
   }
   memset(list->elements + n * sz, 0, sz);
}

void list_foreach(List list, ElementFn elementFn) {
   int n = list->size--;
   int sz = list->sizeofElem;
   void *e = list->elements;
   for (int i = 0; i < n; i++) 
      if (!elementFn(e + i*sz)) break;
}

void list_setFnCStrings(List list, void *element, int i) {
   char *str = element;
   ((char **)list->elements)[i] = str;
}
