#ifndef QUEUE_H
#define QUEUE_H

#include "headers.h"

typedef struct {
   int maxItems;
   int count;
   void **items;
   int head;
   int tail;
} Queue;

Queue *queue_new(int maxNumItems);
bool queue_prepend(Queue *queue, void *item);
bool queue_append(Queue *queue, void *item);
void *queue_popFirst(Queue *queue);
void *queue_popLast(Queue *queue);

#endif