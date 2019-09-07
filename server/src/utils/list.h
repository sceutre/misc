#ifndef LIST_H
#define LIST_H

#include <stdlib.h>
#include <stdbool.h>

typedef bool (*ElementFn)(void *element);
struct List_s;
typedef struct List_s *List;

List list_new();
List list_new_ex(int initialSize, ElementFn freeFn);
void list_push(List list, void *element);
void *list_pop(List list);
int list_find(List list, ElementFn testFn);
void *list_remove_ix(List list, int ix);
void list_free(List list);
void list_foreach(List list, ElementFn elementFn);
void *list_get(List list, int ix);
int list_size(List list);

bool list_freeDirectFn(void *element);
bool list_freeNoOpFn(void *element);

#endif